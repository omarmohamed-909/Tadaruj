import { describe, expect, it } from "vitest";
import { extractPublicIdFromUrl } from "../utils/cloudinary.js";

describe("Cloudinary asset IDs", () => {
  it("extracts the owned ID from a signed authenticated upload response", () => {
    const id = "lms/lectures/507f1f77bcf86cd799439012/lesson";
    expect(extractPublicIdFromUrl(`https://res.cloudinary.com/test/video/authenticated/s--Abcd_123--/v1793042000/${id}.webm`)).toBe(id);
  });
  it("keeps unsigned upload URLs compatible", () => {
    expect(extractPublicIdFromUrl("https://res.cloudinary.com/test/video/upload/v123/folder/lesson.mp4")).toBe("folder/lesson");
  });
  it("preserves the extension in signed raw attachment IDs", () => {
    expect(extractPublicIdFromUrl("https://res.cloudinary.com/test/raw/authenticated/s--Abcd_123--/v123/folder/notes.pdf")).toBe("folder/notes.pdf");
  });
  it("handles signed images and query parameters", () => {
    expect(extractPublicIdFromUrl("https://res.cloudinary.com/test/image/private/s--Abcd_123--/v123/folder/photo.png?download=1")).toBe("folder/photo");
  });
  it("handles URLs without a version or a signature", () => {
    expect(extractPublicIdFromUrl("https://res.cloudinary.com/test/video/authenticated/folder/lesson.mp4")).toBe("folder/lesson");
  });
  it("does not turn a missing ID into a signature", () => {
    expect(extractPublicIdFromUrl("https://res.cloudinary.com/test/video/authenticated/s--Abcd_123--/v123/")).toBe("");
  });
});
