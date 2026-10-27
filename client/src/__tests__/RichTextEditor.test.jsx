import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import RichTextEditor from "../components/RichTextEditor";

vi.mock("@tiptap/react", () => ({ useEditor: vi.fn(), EditorContent: () => <div /> }));
vi.mock("../components/Menu-bar", () => ({ default: () => null }));
let editor;
beforeEach(() => {
  editor = { isDestroyed: false, schema: {}, getHTML: vi.fn(() => "<p>Old</p>"), commands: { setContent: vi.fn() } };
  useEditor.mockReturnValue(editor);
});
describe("RichTextEditor lifecycle", () => {
  it("syncs incoming content without emitting an update loop", () => {
    render(<RichTextEditor input={{ description: "<p>New</p>" }} setInput={vi.fn()} />);
    expect(editor.commands.setContent).toHaveBeenCalledWith("<p>New</p>", { emitUpdate: false });
  });
  it("does not serialize an editor destroyed during Suspense or StrictMode", () => {
    editor.isDestroyed = true;
    render(<RichTextEditor input={{ description: "<p>New</p>" }} setInput={vi.fn()} />);
    expect(editor.getHTML).not.toHaveBeenCalled();
  });
  it("waits until the editor schema exists", () => {
    editor.schema = null;
    render(<RichTextEditor input={{ description: "" }} setInput={vi.fn()} />);
    expect(editor.getHTML).not.toHaveBeenCalled();
  });
});
