CodeShare Media Compressor UI upgrade

Replace these files in your project:
  templates/compressor.html
  static/compressor.css
  static/compressor.js

Features:
- CloudConvert-inspired file queue
- Up to 100 mixed images/videos in one batch
- Drag/drop + Browse + Add more files
- Per-file output format and Options dialog
- Image compression in-browser with quality, target size and resolution
- Video queue and video-specific settings UI
- Individual downloads and results/progress UI

Important:
- This build intentionally does NOT fake video compression. The video encoder hook is ready, but actual video encoding requires ffmpeg.wasm or a server-side FFmpeg service.
- For ZIP download, include JSZip on the page, e.g. a trusted local copy or your chosen package. The JS checks window.JSZip before creating the ZIP.
- For production video compression, the official ffmpeg.wasm docs recommend hosting its assets rather than importing @ffmpeg/ffmpeg directly from a CDN. See https://ffmpegwasm.netlify.app/docs/getting-started/installation/ and https://ffmpegwasm.netlify.app/docs/getting-started/usage/.
