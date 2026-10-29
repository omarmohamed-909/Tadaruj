import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LearningPlayer from "../components/LearningPlayer";

const { save, unwrap, getState } = vi.hoisted(() => ({ save: vi.fn(), unwrap: vi.fn(), getState: vi.fn() }));
vi.mock("react-redux", () => ({ useStore: () => ({ getState }) }));
vi.mock("../features/api/courseProgressApi", () => ({ useSaveLearningPositionMutation: () => [save] }));
vi.mock("../components/languageContext", () => ({ useLanguage: () => ({ language: "en" }) }));
vi.mock("../components/VideoPlayer", () => ({ default: ({ playbackRate, ...props }) => <video data-testid="video" data-playback-rate={playbackRate} {...props} /> }));
beforeEach(() => { getState.mockReturnValue({ auth: { user: { _id: "student" } } }); save.mockReset(); unwrap.mockReset().mockResolvedValue({ success: true }); save.mockReturnValue({ unwrap }); });

function media(initialPosition = 42, props = {}) {
  const view = render(<LearningPlayer accountId="student" courseId="course" lectureId="lesson" initialPosition={initialPosition} {...props} />);
  const video = screen.getByTestId("video");
  Object.defineProperty(video, "duration", { configurable: true, value: 120 });
  fireEvent.loadedMetadata(video);
  return { video, ...view };
}
describe("learning playback resume", () => {
  it("does not flush another student's position after an account change", async () => {
    const { video, unmount } = media();
    video.currentTime = 60;
    getState.mockReturnValue({ auth: { user: { _id: "different-student" } } });
    fireEvent.pause(video);
    unmount();
    await Promise.resolve(); await Promise.resolve();
    expect(save).not.toHaveBeenCalled();
  });
  it("restores once and saves a paused position to the authenticated API", async () => {
    const { video } = media();
    expect(video.currentTime).toBe(42);
    fireEvent.change(screen.getByRole("combobox", { name: "Playback speed" }), { target: { value: "1.5" } });
    expect(video).toHaveAttribute("data-playback-rate", "1.5");
    video.currentTime = 65;
    fireEvent.canPlay(video);
    expect(video.currentTime).toBe(65);
    fireEvent.pause(video);
    await waitFor(() => expect(save).toHaveBeenCalledWith({ courseId: "course", lectureId: "lesson", position: 65, duration: 120 }));
  });
  it("does not resume at the end or save an unplayed loading player", () => {
    const { video } = media(120);
    expect(video.currentTime).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });
  it("shows save errors and allows retry without marking a lesson complete", async () => {
    unwrap.mockRejectedValueOnce(new Error("offline"));
    const ended = vi.fn();
    const { video } = media(42, { onEnded: ended });
    video.currentTime = 57;
    fireEvent.pause(video);
    await screen.findByRole("button", { name: "Retry" });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument());
    expect(ended).not.toHaveBeenCalled();
  });
});
