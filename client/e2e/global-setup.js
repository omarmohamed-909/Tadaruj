import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export default async function generateLocalVideo() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 180;
      const context = canvas.getContext("2d");
      const stream = canvas.captureStream(15);
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const complete = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      let frame = 0;
      const paint = () => { context.fillStyle = "#12383a"; context.fillRect(0, 0, 320, 180); context.fillStyle = "#94e7ce"; context.font = "18px sans-serif"; context.fillText("Tadaruj playback test", 32, 75); context.fillRect(32, 110, (++frame % 30) * 8, 8); };
      paint(); const timer = setInterval(paint, 66); recorder.start();
      await new Promise((resolve) => setTimeout(resolve, 2100));
      recorder.stop(); await complete; clearInterval(timer); stream.getTracks().forEach((track) => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks, { type: "video/webm" }).arrayBuffer()));
    });
    const directory = fileURLToPath(new URL("../../.test-runtime/", import.meta.url));
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}e2e-clip.webm`, Buffer.from(bytes));
  } finally { await browser.close(); }
}
