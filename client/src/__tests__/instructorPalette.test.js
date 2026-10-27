// Keep shared instructor screens on semantic tokens; status colors are intentional.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesheet = readFileSync(resolve("src/index.css"), "utf8");

const pages = import.meta.glob([
  "../pages/admin/InstructorDashboard.jsx",
  "../pages/admin/Sidebar.jsx",
  "../pages/admin/ManualOrders.jsx",
  "../pages/admin/QuizDashboard.jsx",
  "../pages/admin/course/*.jsx",
  "../pages/admin/lecture/*.jsx",
  "../components/RichTextEditor.jsx",
  "../components/Menu-bar.jsx",
  "../components/Navbar.jsx",
  "../DarkMode.jsx",
], { query: "?raw", import: "default", eager: true });

describe("instructor palette regression", () => {
  it.each(Object.keys(pages))("uses semantic colors instead of the old navy/blue palette: %s", (path) => {
    expect(pages[path]).not.toMatch(/(?:bg|border|text|from|to)-(?:slate|gray|blue|cyan|violet)-\d+/);
    expect(pages[path]).not.toMatch(/#(?:020617|0f172a|1F1F1F|2C2C2C)/i);
  });

  it.each(["light", "dark"])("keeps normal text at WCAG AA contrast in %s mode", (mode) => {
    const selector = mode === "dark" ? ":root.dark[data-academy-theme]" : ":root[data-academy-theme]";
    const block = stylesheet.split(`${selector} {`)[1].split("}")[0];
    const colors = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
    const luminance = (hex) => {
      const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    for (const [foreground, background] of [
      ["foreground", "background"], ["card-foreground", "card"],
      ["primary-foreground", "primary"], ["popover-foreground", "popover"],
      ["muted-foreground", "muted"], ["muted-foreground", "card"],
      ["accent-foreground", "accent"], ["secondary-foreground", "secondary"],
      ["primary", "card"], ["primary", "accent"], ["primary", "muted"],
    ]) {
      const values = [luminance(colors[foreground]), luminance(colors[background])];
      const ratio = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
      expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
