# CodeShare - Code Snippet Sharing Platform

A web application for sharing code snippets with automatic language detection and syntax highlighting.

## Features

- **Automatic Language Detection**: Paste your code and the app automatically detects the programming language
- **Manual Language Override**: Select from a dropdown to manually specify the language if auto-detection is incorrect
- **Syntax Highlighting**: Beautiful syntax highlighting for 15+ programming languages
- **Live Preview**: See how your code will look before sharing
- **Snippet Storage**: Store and display shared code snippets (in-memory storage)

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
│   └── index.html      # Main HTML template
├── static/
│   ├── style.css       # Stylesheet
│   └── app.js          # Frontend JavaScript
└── README.md           # This file
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Render main page |
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

## License

MIT License - Feel free to use and modify as needed!
