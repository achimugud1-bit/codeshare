# CodeShare compressor fix

This patch fixes the compressor upload/selection flow.

Files:
- `static/compressor.js` — handles Browse Files, drag/drop, previews, settings, image compression, results and download.
- `static/compressor.css` — compressor UI styles.

Important:
- Image compression is performed in the browser with Canvas.
- The selected image is not sent to the Flask server.
- Video files can be selected and previewed, but this patch does not fake video compression. A real video encoder such as FFmpeg/WebCodecs must be added for video encoding.
