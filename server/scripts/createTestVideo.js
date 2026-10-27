// Generate a two-second synthetic video locally. No camera, microphone or personal files.
import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../../.test-runtime/", import.meta.url));
await mkdir(directory, { recursive: true });
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Tadaruj test media</title>
<body style="font:18px system-ui;background:#102c2f;color:#edf7f1;padding:40px">
<h1>Local test video</h1><p>No camera or microphone is used.</p>
<canvas width="640" height="360" style="max-width:100%"></canvas><p><button>Generate two-second test video</button></p><p role="status">Ready</p>
<script>
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),status=document.querySelector('[role=status]');
document.querySelector('button').onclick=async()=>{
 document.querySelector('button').disabled=true;
 try {
  const stream=canvas.captureStream(15),chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=async()=>{
   stream.getTracks().forEach(track=>track.stop());
   const response=await fetch('/recording',{method:'POST',body:new Blob(chunks,{type:'video/webm'})});
   status.textContent=response.ok?'Saved: .test-runtime/qa-clip.webm':'Could not save test video';
  };
  let frame=0;const paint=()=>{ctx.fillStyle='#12383a';ctx.fillRect(0,0,640,360);ctx.fillStyle='#94e7ce';ctx.font='32px sans-serif';ctx.fillText('Tadaruj - playback test',70,130);ctx.fillRect(70,200,(frame++%30)*16,12)};
  paint();const timer=setInterval(paint,66);recorder.start();status.textContent='Recording synthetic animation...';
  setTimeout(()=>{clearInterval(timer);recorder.stop()},2100);
 }catch(error){status.textContent=error.message;}
};
</script></body></html>`;
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }
  if (req.method !== "POST" || req.url !== "/recording") { res.writeHead(404); return res.end(); }
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024) throw new Error("Test clip is too large");
      chunks.push(chunk);
    }
    await writeFile(`${directory}qa-clip.webm`, Buffer.concat(chunks));
    res.end("Saved");
    console.log("Synthetic video saved to .test-runtime/qa-clip.webm");
    server.close();
  } catch (error) { res.writeHead(400); res.end(error.message); }
});
server.listen(8091, "127.0.0.1", () => console.log("Open http://localhost:8091/ to generate the test video."));
