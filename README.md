# CodeShare - Code Snippet Sharing Platform

A web application for sharing code snippets with automatic language detection and syntax highlighting.

## Features

### Code Sharing
- **Automatic Language Detection**: Paste your code and the app automatically detects the programming language
- **Manual Language Override**: Select from a dropdown to manually specify the language if auto-detection is incorrect
- **Syntax Highlighting**: Beautiful syntax highlighting for 15+ programming languages
- **Live Preview**: See how your code will look before sharing
- **Snippet Storage**: Store and display shared code snippets (in-memory storage)

### Media Compressor 🆕
- **Image Compression**: Compress JPG, PNG, WebP, AVIF, and GIF images
- **Video Compression**: Compress MP4, WebM, MOV, MKV, and AVI videos using FFmpeg.wasm
- **Smart Compression**: Automatically optimize settings for best quality/size ratio
- **Target File Size**: Specify desired output size (e.g., 1 MB, 5 MB)
- **Quality Presets**: Maximum Quality, High Quality, Balanced, Smallest File, or Custom
- **Resolution Control**: Resize to 4K, 1440p, 1080p, 720p, 480p, or keep original
- **Before/After Comparison**: Visual comparison of original and compressed media
- **Privacy First**: All compression happens locally in your browser - files are never uploaded

## Supported Languages

- Python
- JavaScript
- Java
- C++
- C
- PHP
- Ruby
- Go
- Rust
- HTML
- CSS
- SQL
- Bash/Shell
- JSON
- YAML
- Plain Text

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python Flask
- **Language Detection**: Custom regex-based pattern matching

## Installation & Setup

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

### Step 1: Install Dependencies

```bash
pip install flask
```

### Step 2: Run the Application

```bash
python app.py
```

The server will start on `http://localhost:5000`

### Step 3: Access the Application

Open your web browser and navigate to:
```
http://localhost:5000
```

## Project Structure

```
/workspace
├── app.py              # Flask backend server
├── templates/
│   ├── index.html      # Main HTML template (Code Sharing)
│   └── compressor.html # Media Compressor page
├── static/
│   ├── style.css       # Main stylesheet
│   ├── app.js          # Code sharing frontend JavaScript
│   ├── compressor.css  # Media Compressor styles
│   └── compressor.js   # Media Compressor frontend JavaScript
└── README.md           # This file
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Render main page (Code Sharing) |
| `/compressor` | GET | Render Media Compressor page |
| `/api/detect` | POST | Detect language from code |
| `/api/highlight` | POST | Get syntax-highlighted HTML |
| `/api/snippets` | GET | Retrieve all snippets |
| `/api/snippets` | POST | Create a new snippet |
| `/api/languages` | GET | List available languages |

## Usage

1. **Enter a title** for your code snippet (optional)
2. **Paste or type your code** in the text area
3. The app will **automatically detect** the programming language
4. **Optionally override** the detected language using the dropdown
5. Click **"Share Snippet"** to save and display your code
6. View your snippet in the **"Shared Snippets"** section below

## How Language Detection Works

The application uses a pattern-matching algorithm that scores code against known patterns for each supported language. For example:

- Python: Looks for `def`, `class`, `import`, `print()`, etc.
- JavaScript: Looks for `function`, `const`, `let`, `=>`, `console.log`, etc.
- Java: Looks for `public class`, `System.out`, annotations, etc.

The language with the highest score is selected as the detected language.

## Syntax Highlighting

The application applies custom syntax highlighting using regex patterns to identify:
- Keywords (if, else, for, while, etc.)
- Strings (quoted text)
- Comments (single-line and multi-line)
- Numbers (integers, floats, hex)
- Built-in functions and types
- Decorators (@decorator)

## Notes

- Snippets are stored **in-memory** only (they will be lost when the server restarts)
- For production use, consider adding a database for persistent storage
- The application runs in debug mode by default - disable for production

## Media Compressor Usage

### Image Compression
1. Navigate to **Media Compressor** (or `/compressor`)
2. Drag and drop an image or click to browse
3. Choose compression settings:
   - **Smart Compression**: Automatically optimize for best quality/size
   - **Output Format**: Auto, WebP, AVIF, JPEG, or PNG
   - **Quality Preset**: Maximum, High, Balanced, Smallest, or Custom
   - **Resolution**: Original, 4K, 1440p, 1080p, 720p, or 480p
   - **Target Size**: Optionally specify desired output size
4. Click **Compress**
5. Compare original vs compressed results
6. Download the compressed image

### Video Compression
1. Navigate to **Media Compressor** (or `/compressor`)
2. Drag and drop a video or click to browse
3. Choose compression settings:
   - **Smart Compression**: Automatically optimize using H.264 codec
   - **Output Format**: MP4 (H.264) or WebM (VP9)
   - **Quality Preset**: Maximum, High, Balanced, Smallest, or Custom
   - **Resolution**: Original, 4K, 1440p, 1080p, 720p, or 480p
   - **Target Size**: Optionally specify desired output size
4. Click **Compress** (FFmpeg.wasm will be loaded on first use)
5. Wait for compression to complete (progress shown)
6. Preview and download the compressed video

### Notes on Video Compression
- First-time FFmpeg loading may take a few seconds
- Large videos may take several minutes to compress
- Compression happens entirely in your browser - no files are uploaded
- For very large files (>500MB), consider using smaller chunks or desktop software
- Browser memory limits may apply for extremely large videos

## Browser Compatibility

### Image Compression
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Mobile browsers: ✅ Supported

### Video Compression (FFmpeg.wasm)
- Chrome/Edge: ✅ Full support (requires SharedArrayBuffer in some cases)
- Firefox: ⚠️ Limited support (may require COOP/COEP headers)
- Safari: ⚠️ Limited support
- Mobile browsers: ⚠️ Varies by device

## Privacy & Security

- **No Server Uploads**: All media processing happens client-side
- **No Data Storage**: Files are processed in memory and discarded after download
- **No Tracking**: No analytics or telemetry
- **Open Source**: All code is visible and auditable

## Limitations

- Video compression speed depends on device CPU and file size
- Very large files (>500MB) may cause browser memory issues
- Some video formats may not be supported by all browsers
- FFmpeg.wasm requires modern browser with WebAssembly support
- Aggressive compression (e.g., 30MB → 1MB) will reduce quality

## License

MIT License - Feel free to use and modify as needed!
