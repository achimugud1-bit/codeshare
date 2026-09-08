"""
Code Sharing Platform - Flask Backend
Handles language detection, snippet storage, and syntax highlighting
"""

from flask import Flask, render_template, request, jsonify
import re
from datetime import datetime

app = Flask(__name__)

# In-memory storage for code snippets
snippets = []

# Language patterns for detection
LANGUAGE_PATTERNS = {
    'python': [
        r'\bdef\s+\w+\s*\(',
        r'\bclass\s+\w+',
        r'\bimport\s+\w+',
        r'\bprint\s*\(',
        r'if\s+__name__\s*==\s*[\'"]__main__[\'"]',
        r':\s*$',  # Python's colon at end of lines
    ],
    'javascript': [
        r'\bfunction\s*\w*\s*\(',
        r'\bconst\s+\w+\s*=',
        r'\blet\s+\w+\s*=',
        r'\bvar\s+\w+\s*=',
        r'=>\s*',  # Arrow functions
        r'\bconsole\.log\s*\(',
        r'document\.',
        r'\$\(',  # jQuery
    ],
    'java': [
        r'\bpublic\s+(static\s+)?(void|int|String|boolean|double|float|long|short|byte|char)\s+',
        r'\bclass\s+\w+',
        r'\bSystem\.out\.print',
        r'\bnew\s+\w+\s*\(',
        r'\bthrows\s+\w+',
        r'@\w+',  # Annotations
    ],
    'cpp': [
        r'#include\s*<\w+>',
        r'\bstd::',
        r'\bcout\s*<<',
        r'\bcin\s*>>',
        r'\bnamespace\s+\w+',
        r'\btemplate\s*<',
        r'->\s*',  # Lambda or pointer
    ],
    'c': [
        r'#include\s*<\w+>',
        r'\bprintf\s*\(',
        r'\bscanf\s*\(',
        r'\bmalloc\s*\(',
        r'\bfree\s*\(',
        r'\*(?!\*)',  # Pointer dereference (not **)
    ],
    'php': [
        r'<\?php',
        r'\$\w+\s*=',
        r'\becho\s+',
        r'\bfunction\s+\w+\s*\(',
        r'->\w+\s*\(',
    ],
    'ruby': [
        r'\bdef\s+\w+',
        r'\bend\s*$',
        r'\bputs\s+',
        r'\brequire\s+',
        r':\w+',  # Symbols
        r'\bdo\s*\|',
    ],
    'go': [
        r'\bfunc\s+\w*\s*\(',
        r'\bpackage\s+\w+',
        r'\bimport\s*\(',
        r':=\s*',  # Short variable declaration
        r'\bfmt\.',
    ],
    'rust': [
        r'\bfn\s+\w+\s*\(',
        r'\blet\s+(mut\s+)?\w+\s*=',
        r'\bimpl\s+\w+',
        r'\bstruct\s+\w+',
        r'->\s*\w+',  # Return type
        r'\boptional\s*<',
    ],
    'html': [
        r'<!DOCTYPE\s+html>',
        r'<html',
        r'<head>',
        r'<body>',
        r'<div',
        r'<script',
        r'<style',
    ],
    'css': [
        r'\{\s*[\w-]+\s*:',
        r'@media\s*\(',
        r'@keyframes',
        r'\.[\w-]+\s*\{',
        r'#[\w-]+\s*\{',
    ],
    'sql': [
        r'\bSELECT\s+\w+',
        r'\bINSERT\s+INTO',
        r'\bUPDATE\s+\w+',
        r'\bDELETE\s+FROM',
        r'\bCREATE\s+TABLE',
        r'\bWHERE\s+\w+',
    ],
    'bash': [
        r'^#!/bin/bash',
        r'^#!/bin/sh',
        r'\becho\s+',
        r'\bexport\s+',
        r'\$\{?\w+\}?',
        r'\bwget\s+',
        r'\bcurl\s+',
    ],
    'json': [
        r'^\s*\{',
        r'"\w+"\s*:',
        r'\[\s*\{',
    ],
    'yaml': [
        r'^\w+:\s*$',
        r'^\s+-\s+\w+',
        r'^\s+\w+:\s+',
    ],
}

# Pygments-style CSS classes for syntax highlighting
HIGHLIGHT_PATTERNS = {
    'keyword': [
        r'\b(def|class|if|else|elif|for|while|return|import|from|as|try|except|finally|with|lambda|yield|global|nonlocal|pass|break|continue|and|or|not|in|is|True|False|None)\b',
        r'\b(function|const|let|var|if|else|for|while|return|import|export|default|class|extends|new|this|super|try|catch|finally|throw|async|await|switch|case|break|continue|typeof|instanceof|in|of|null|undefined|true|false)\b',
        r'\b(public|private|protected|static|final|abstract|interface|implements|extends|throws|new|this|super|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|class|package|import|void|int|boolean|double|float|long|short|byte|char|string|null|true|false)\b',
        r'\b(func|package|import|var|const|type|struct|interface|map|chan|go|defer|return|if|else|for|range|switch|case|fallthrough|break|continue|goto)\b',
        r'\b(fn|let|mut|pub|mod|use|impl|trait|struct|enum|match|if|else|for|while|loop|return|break|continue|as|move|ref)\b',
        r'\b(include|require|function|class|public|private|protected|static|final|abstract|interface|extends|implements|new|return|if|else|for|foreach|while|switch|case|break|continue|try|catch|finally|throw|echo|print|isset|unset|empty|array)\b',
        r'\b(def|class|module|require|include|extend|prepend|public|private|protected|attr_accessor|attr_reader|attr_writer|initialize|return|if|else|elsif|unless|case|when|then|for|while|until|do|begin|rescue|ensure|end|yield|super|self)\b',
        r'\b(#include|using|namespace|template|typename|class|struct|union|enum|public|private|protected|virtual|override|final|static|const|constexpr|inline|extern|register|volatile|mutable|explicit|friend|operator|new|delete|this|throw|try|catch|noexcept)\b',
    ],
    'string': [
        r'(["\'])(?:\\.|(?!\1).)*\1',  # Single and double quoted strings
        r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')',  # Triple quoted strings
        r'`(?:\\.|[^`\\])*`',  # Template literals
    ],
    'comment': [
        r'#.*$',  # Hash comments
        r'//.*$',  # Single line comments
        r'/\*[\s\S]*?\*/',  # Multi-line comments
        r'<!--[\s\S]*?-->',  # HTML comments
        r'/\*[\s\S]*?\*/',  # CSS/JS multi-line
    ],
    'number': [
        r'\b\d+\.?\d*(?:[eE][+-]?\d+)?\b',
        r'\b0x[0-9a-fA-F]+\b',
        r'\b0b[01]+\b',
        r'\b0o[0-7]+\b',
    ],
    'decorator': [
        r'@\w+',
    ],
    'builtin': [
        r'\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|file|input|sorted|reversed|enumerate|zip|map|filter|reduce|sum|min|max|abs|round|pow|divmod|hex|oct|bin|chr|ord|ascii|repr|vars|dir|help|id|hash|callable|compile|exec|eval|globals|locals|locals|memoryview|slice|staticmethod|classmethod|property|object|Exception|BaseException)\b',
        r'\b(console|window|document|Math|JSON|XMLHttpRequest|Promise|Map|Set|WeakMap|WeakSet|Symbol|Array|Object|String|Number|Boolean|Date|RegExp|Error|Function|Arguments|Generator)\b',
        r'\b(System|Math|String|Integer|Long|Double|Float|Boolean|Character|Byte|Short|Object|Class|Thread|Runnable|Callable|Future|Optional|Stream|List|ArrayList|LinkedList|Map|HashMap|TreeMap|Set|HashSet|TreeSet|Collection|Arrays|Collections|StringBuilder|BufferedReader|PrintWriter|Scanner|File|IOException|Exception|RuntimeException|NullPointerException|IllegalArgumentException)\b',
        r'\b(fmt|os|io|net|http|json|encoding|strings|strconv|time|sync|context|errors|bufio|bytes|sort|regexp|path|filepath|reflect|runtime|unsafe)\b',
        r'\b(std::|println!|print!|format!|vec!|hashmap!|Box| Rc|RefCell|Option|Some|None|Result|Ok|Err|Vec|String|str|i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|())\b',
    ],
}


def detect_language(code: str) -> str:
    """
    Detect the programming language of the given code.
    Returns the detected language or 'plaintext' if unknown.
    """
    scores = {}
    
    for lang, patterns in LANGUAGE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            matches = re.findall(pattern, code, re.MULTILINE)
            score += len(matches)
        if score > 0:
            scores[lang] = score
    
    if not scores:
        return 'plaintext'
    
    # Return the language with the highest score
    return max(scores, key=scores.get)


def highlight_code(code: str, language: str) -> str:
    """
    Apply syntax highlighting to code using regex patterns.
    Returns HTML with span tags for different token types.
    """
    # Escape HTML first
    code = code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    if language == 'plaintext':
        return code
    
    # Define order of replacement (more specific patterns first)
    replacements = [
        ('comment', HIGHLIGHT_PATTERNS['comment']),
        ('string', HIGHLIGHT_PATTERNS['string']),
        ('keyword', HIGHLIGHT_PATTERNS['keyword']),
        ('builtin', HIGHLIGHT_PATTERNS['builtin']),
        ('number', HIGHLIGHT_PATTERNS['number']),
        ('decorator', HIGHLIGHT_PATTERNS['decorator']),
    ]
    
    # We need to be careful not to replace inside already-replaced content
    # Use placeholders to protect replaced content
    placeholder_map = {}
    placeholder_counter = [0]
    
    def make_placeholder(match_type, match_content):
        placeholder = f"___PLACEHOLDER_{placeholder_counter[0]}___"
        placeholder_counter[0] += 1
        placeholder_map[placeholder] = f'<span class="token-{match_type}">{match_content}</span>'
        return placeholder
    
    for token_type, patterns in replacements:
        for pattern in patterns:
            def replacer(match):
                return make_placeholder(token_type, match.group(0))
            code = re.sub(pattern, replacer, code, flags=re.MULTILINE)
    
    # Restore placeholders
    for placeholder, html in placeholder_map.items():
        code = code.replace(placeholder, html)
    
    return code


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html', snippets=snippets)


@app.route('/api/detect', methods=['POST'])
def api_detect():
    """API endpoint to detect language from code."""
    data = request.get_json()
    code = data.get('code', '')
    
    if not code:
        return jsonify({'error': 'No code provided'}), 400
    
    detected = detect_language(code)
    return jsonify({
        'detected_language': detected,
        'available_languages': list(LANGUAGE_PATTERNS.keys()) + ['plaintext']
    })


@app.route('/api/highlight', methods=['POST'])
def api_highlight():
    """API endpoint to get syntax-highlighted code."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'plaintext')
    
    if not code:
        return jsonify({'error': 'No code provided'}), 400
    
    highlighted = highlight_code(code, language)
    return jsonify({
        'highlighted_code': highlighted,
        'language': language
    })


@app.route('/api/snippets', methods=['GET'])
def api_get_snippets():
    """API endpoint to get all snippets."""
    return jsonify({
        'snippets': snippets[::-1]  # Return newest first
    })


@app.route('/api/snippets', methods=['POST'])
def api_create_snippet():
    """API endpoint to create a new snippet."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'plaintext')
    title = data.get('title', 'Untitled Snippet')
    
    if not code:
        return jsonify({'error': 'No code provided'}), 400
    
    # Auto-detect if language is 'auto'
    if language == 'auto':
        language = detect_language(code)
    
    snippet = {
        'id': data.get('id') or len(snippets) + 1,
        'title': title,
        'code': code,
        'language': language,
        'highlighted_code': highlight_code(code, language),
        'created_at': data.get('created_at') or datetime.now().isoformat()
    }
    
    snippets.append(snippet)
    
    return jsonify({
        'success': True,
        'snippet': snippet
    }), 201


@app.route('/api/snippets/<snippet_id>', methods=['GET'])
def api_get_snippet(snippet_id):
    """Return a single snippet by id."""
    snippet = next((s for s in snippets if str(s.get('id')) == str(snippet_id)), None)
    if not snippet:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'snippet': snippet})


@app.route('/api/snippets/<snippet_id>', methods=['DELETE'])
def api_delete_snippet(snippet_id):
    """Delete a snippet by id."""
    global snippets
    before = len(snippets)
    snippets = [s for s in snippets if str(s.get('id')) != str(snippet_id)]
    if len(snippets) == before:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'success': True})


@app.route('/api/languages', methods=['GET'])
def api_get_languages():
    """API endpoint to get available languages."""
    languages = list(LANGUAGE_PATTERNS.keys()) + ['plaintext']
    return jsonify({
        'languages': languages
    })


if __name__ == '__main__':
    print("Starting Code Sharing Platform...")
    print("Access the application at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
