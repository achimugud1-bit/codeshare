/**
 * CodeShare — editor, live preview, library, and local persistence
 */

const STORAGE_KEY = 'codeshare.snippets.v1';
const THEME_KEY = 'codeshare.theme';

const LANG_EXT = {
    python: 'py', javascript: 'js', java: 'java', cpp: 'cpp', c: 'c', php: 'php',
    ruby: 'rb', go: 'go', rust: 'rs', html: 'html', css: 'css', sql: 'sql',
    bash: 'sh', json: 'json', yaml: 'yml', plaintext: 'txt'
};

const KEYWORDS = {
    python: 'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield',
    javascript: 'async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|null|undefined|true|false',
    java: 'abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|true|false|null',
    cpp: 'alignas|alignof|and|auto|bool|break|case|catch|char|class|const|constexpr|continue|default|delete|do|double|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|nullptr|operator|or|private|protected|public|register|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|while',
    c: 'auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while',
    php: 'abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield|true|false|null',
    ruby: 'BEGIN|END|alias|and|begin|break|case|class|def|defined|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield',
    go: 'break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var',
    rust: 'as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while',
    sql: 'SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT|CREATE|TABLE|INTO|VALUES|SET|AS|DISTINCT|HAVING|NULL|NOT|IN|IS|LIKE|BETWEEN',
    bash: 'if|then|else|elif|fi|for|while|do|done|case|esac|function|return|in|select|until|time|coproc'
};

const DETECT_PATTERNS = {
    python: [/\bdef\s+\w+\s*\(/, /\bclass\s+\w+/, /\bimport\s+\w+/, /\bprint\s*\(/, /if\s+__name__\s*==/],
    javascript: [/\bfunction\s*\w*\s*\(/, /\bconst\s+\w+\s*=/, /\blet\s+\w+\s*=/, /=>\s*/, /\bconsole\.log\s*\(/],
    java: [/\bpublic\s+(static\s+)?(void|int|String)/, /\bSystem\.out\.print/, /\bclass\s+\w+/],
    cpp: [/#include\s*<\w+>/, /\bstd::/, /\bcout\s*<</],
    c: [/#include\s*<\w+>/, /\bprintf\s*\(/, /\bmalloc\s*\(/],
    php: [/<\?php/, /\$\w+\s*=/, /\becho\s+/],
    ruby: [/\bdef\s+\w+/, /\bputs\s+/, /\bend\s*$/m],
    go: [/\bfunc\s+\w*\s*\(/, /\bpackage\s+\w+/, /:=\s*/],
    rust: [/\bfn\s+\w+\s*\(/, /\blet\s+(mut\s+)?\w+\s*=/, /\bimpl\s+/],
    html: [/<!DOCTYPE\s+html>/i, /<html/i, /<\/div>/i],
    css: [/\{\s*[\w-]+\s*:/, /@media\s*\(/, /\.[\w-]+\s*\{/],
    sql: [/\bSELECT\s+/i, /\bINSERT\s+INTO/i, /\bCREATE\s+TABLE/i],
    bash: [/^#!\/bin\/(ba)?sh/m, /\bexport\s+/, /\becho\s+/],
    json: [/^\s*\{/, /"\w+"\s*:/],
    yaml: [/^\w+:\s*$/m, /^\s+-\s+/m]
};

const EXAMPLE = {
    title: 'Fibonacci helper',
    language: 'python',
    code: `def fibonacci(n):
    """Return the nth Fibonacci number."""
    if n < 2:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b


if __name__ == "__main__":
    print([fibonacci(i) for i in range(10)])
`
};

const els = {
    form: document.getElementById('snippet-form'),
    code: document.getElementById('code'),
    title: document.getElementById('title'),
    language: document.getElementById('language-select'),
    detected: document.getElementById('detected-language'),
    previewSection: document.getElementById('preview-section'),
    previewTitle: document.getElementById('preview-title'),
    previewLanguage: document.getElementById('preview-language'),
    previewCode: document.getElementById('preview-code'),
    previewGutter: document.getElementById('preview-gutter'),
    previewFrame: document.getElementById('preview-frame'),
    container: document.getElementById('snippets-container'),
    count: document.getElementById('snippet-count'),
    search: document.getElementById('search'),
    filter: document.getElementById('filter-language'),
    sort: document.getElementById('sort-snippets'),
    stats: document.getElementById('code-stats'),
    themeBtn: document.getElementById('btn-theme'),
    wrapBtn: document.getElementById('btn-wrap'),
    runBtn: document.getElementById('btn-run'),
    runPanel: document.getElementById('run-panel'),
    runOutput: document.getElementById('run-output'),
    runFrame: document.getElementById('run-frame'),
    modal: document.getElementById('confirm-modal'),
    confirmYes: document.getElementById('confirm-yes'),
    confirmNo: document.getElementById('confirm-no'),
    confirmText: document.getElementById('confirm-text')
};

let snippets = [];
let detectedLanguage = 'plaintext';
let pendingDeleteId = null;
let wrapOn = false;

function uid() {
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function detectLanguage(code) {
    const scores = {};
    Object.entries(DETECT_PATTERNS).forEach(([lang, patterns]) => {
        let score = 0;
        patterns.forEach((re) => {
            const matches = code.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`));
            score += matches ? matches.length : 0;
        });
        if (score) scores[lang] = score;
    });
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return ranked.length ? ranked[0][0] : 'plaintext';
}

function highlightCode(code, language) {
    let src = escapeHtml(code);
    if (!language || language === 'plaintext' || language === 'auto') return src;

    const placeholders = [];
    const stash = (html) => {
        const token = `__H${placeholders.length}__`;
        placeholders.push(html);
        return token;
    };

    const commentRes = language === 'python' || language === 'bash' || language === 'yaml' || language === 'ruby'
        ? [/#.*$/gm]
        : language === 'html'
            ? [/&lt;!--[\s\S]*?--&gt;/g]
            : [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g];

    commentRes.forEach((re) => {
        src = src.replace(re, (m) => stash(`<span class="token-comment">${m}</span>`));
    });

    src = src.replace(/(&quot;|&#39;|")(?:\\.|(?!\1).)*\1/g, (m) => stash(`<span class="token-string">${m}</span>`));
    src = src.replace(/`(?:\\.|[^`\\])*`/g, (m) => stash(`<span class="token-string">${m}</span>`));
    src = src.replace(/'(?:\\.|[^'\\])*'/g, (m) => stash(`<span class="token-string">${m}</span>`));

    src = src.replace(/\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/g, (m) => stash(`<span class="token-number">${m}</span>`));
    src = src.replace(/@\w+/g, (m) => stash(`<span class="token-decorator">${m}</span>`));

    const kw = KEYWORDS[language];
    if (kw) {
        const flags = language === 'sql' ? 'gi' : 'g';
        src = src.replace(new RegExp(`\\b(${kw})\\b`, flags), '<span class="token-keyword">$1</span>');
    }

    placeholders.forEach((html, i) => {
        src = src.replace(`__H${i}__`, html);
    });
    return src;
}

function lineCount(code) {
    if (!code) return 0;
    return code.split('\n').length;
}

function gutterHtml(code) {
    const n = Math.max(lineCount(code), 1);
    return Array.from({ length: n }, (_, i) => String(i + 1)).join('\n');
}

function formatDate(iso) {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        snippets = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(snippets)) snippets = [];
    } catch {
        snippets = [];
    }
}

function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

function showNotification(message) {
    document.querySelectorAll('.notification').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
}

function resolvedLanguage() {
    return els.language.value === 'auto' ? detectedLanguage : els.language.value;
}

function updateStats() {
    const code = els.code.value;
    els.stats.textContent = `${lineCount(code)} lines · ${code.length} chars`;
}

function updatePreview() {
    const code = els.code.value;
    updateStats();
    if (!code.trim()) {
        els.previewSection.classList.add('hidden');
        return;
    }
    const language = resolvedLanguage();
    const title = els.title.value.trim() || 'Untitled snippet';
    els.previewTitle.textContent = title;
    els.previewLanguage.textContent = capitalize(language);
    els.previewCode.innerHTML = highlightCode(code, language);
    els.previewGutter.textContent = gutterHtml(code);
    els.previewSection.classList.remove('hidden');
    els.previewFrame.classList.toggle('wrap-on', wrapOn);
}

function updateDetectedBadge(text, empty) {
    els.detected.textContent = text;
    els.detected.classList.toggle('empty', !!empty);
}

async function runDetect() {
    const code = els.code.value.trim();
    if (!code) {
        updateDetectedBadge('Waiting for code…', true);
        detectedLanguage = 'plaintext';
        return;
    }
    detectedLanguage = detectLanguage(code);
    try {
        const response = await fetch('/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.detected_language) detectedLanguage = data.detected_language;
        }
    } catch {
        /* client-side detection is enough */
    }
    updateDetectedBadge(capitalize(detectedLanguage), false);
    if (els.language.value === 'auto') updatePreview();
}

function populateFilter() {
    const current = els.filter.value;
    const langs = [...new Set(snippets.map((s) => s.language))].sort();
    els.filter.innerHTML = '<option value="all">All languages</option>' +
        langs.map((l) => `<option value="${escapeHtml(l)}">${capitalize(l)}</option>`).join('');
    if ([...els.filter.options].some((o) => o.value === current)) els.filter.value = current;
}

function visibleSnippets() {
    const q = els.search.value.trim().toLowerCase();
    const lang = els.filter.value;
    const sort = els.sort.value;
    let list = snippets.filter((s) => {
        const matchesLang = lang === 'all' || s.language === lang;
        const hay = `${s.title}\n${s.code}\n${s.language}`.toLowerCase();
        return matchesLang && (!q || hay.includes(q));
    });
    list = [...list].sort((a, b) => {
        if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sort === 'title') return a.title.localeCompare(b.title);
        return new Date(b.created_at) - new Date(a.created_at);
    });
    return list;
}

function renderSnippets() {
    populateFilter();
    els.count.textContent = String(snippets.length);
    const list = visibleSnippets();
    const hash = location.hash.replace('#', '');

    if (!snippets.length) {
        els.container.innerHTML = '<div class="empty-state"><p class="no-snippets">No snippets yet. Share one above or load an example.</p></div>';
        return;
    }
    if (!list.length) {
        els.container.innerHTML = '<div class="empty-state"><p class="no-snippets">No snippets match that search.</p></div>';
        return;
    }

    els.container.innerHTML = list.map((s) => `
        <article class="snippet-card${s.id === hash ? ' active' : ''}${s.code.split('\n').length > 18 ? ' collapsed' : ''}" id="${escapeHtml(s.id)}" data-id="${escapeHtml(s.id)}">
            <div class="snippet-header">
                <span class="snippet-title">${escapeHtml(s.title)}</span>
                <div class="snippet-meta">
                    <span class="snippet-language">${escapeHtml(s.language)}</span>
                    <span class="snippet-date">${formatDate(s.created_at)}</span>
                </div>
            </div>
            <div class="snippet-body">
                <div class="code-frame${wrapOn ? ' wrap-on' : ''}">
                    <pre class="gutter" aria-hidden="true">${gutterHtml(s.code)}</pre>
                    <pre><code>${highlightCode(s.code, s.language)}</code></pre>
                </div>
            </div>
            <div class="snippet-actions">
                <button type="button" class="btn btn-tiny" data-act="run">Run</button>
                <button type="button" class="btn btn-tiny" data-act="copy">Copy</button>
                <button type="button" class="btn btn-tiny" data-act="download">Download</button>
                <button type="button" class="btn btn-tiny" data-act="link">Copy link</button>
                <button type="button" class="btn btn-tiny" data-act="duplicate">Duplicate</button>
                <button type="button" class="btn btn-tiny" data-act="expand">Expand</button>
                <button type="button" class="btn btn-tiny" data-act="delete">Delete</button>
            </div>
        </article>
    `).join('');
}

function askDelete(id, title) {
    pendingDeleteId = id;
    els.confirmText.textContent = `Delete “${title}”? This cannot be undone.`;
    els.modal.classList.remove('hidden');
}

function closeModal() {
    pendingDeleteId = null;
    els.modal.classList.add('hidden');
}

async function deleteSnippet(id) {
    snippets = snippets.filter((s) => String(s.id) !== String(id));
    try {
        saveLocal();
    } catch { /* ignore */ }
    renderSnippets();
    showNotification('Snippet deleted');
    fetch(`/api/snippets/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
}

async function copyText(text, label) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showNotification(label);
            return;
        }
        throw new Error('clipboard unavailable');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showNotification(label);
        } catch {
            showNotification('Copy failed');
        }
        ta.remove();
    }
}

function downloadSnippet(snippet) {
    const ext = LANG_EXT[snippet.language] || 'txt';
    const blob = new Blob([snippet.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snippet.title.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'snippet'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
    else applyTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

async function handleSubmit(e) {
    e.preventDefault();
    const code = els.code.value.trim();
    if (!code) {
        showNotification('Add some code first');
        return;
    }
    if (els.language.value === 'auto') await runDetect();
    const language = resolvedLanguage();
    const snippet = {
        id: uid(),
        title: els.title.value.trim() || 'Untitled snippet',
        code: els.code.value,
        language,
        highlighted_code: highlightCode(els.code.value, language),
        created_at: new Date().toISOString()
    };
    snippets.unshift(snippet);
    try {
        saveLocal();
    } catch { /* private mode or quota */ }

    els.form.reset();
    detectedLanguage = 'plaintext';
    updateDetectedBadge('Waiting for code…', true);
    updatePreview();
    renderSnippets();
    location.hash = snippet.id;
    showNotification('Snippet shared');

    fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snippet)
    }).catch(() => { /* stored locally */ });
}

const RUNNABLE = new Set(['javascript', 'python', 'html', 'css', 'json']);
const RUN_TIMEOUT_MS = 4000;
let pyodideLoader = null;
let runBusy = false;

function showRunPanel() {
    els.runPanel.classList.remove('hidden');
}

function clearRunOutput() {
    els.runOutput.textContent = '';
    els.runFrame.classList.add('hidden');
    els.runFrame.removeAttribute('srcdoc');
}

function appendRun(kind, text) {
    if (text === '' || text == null) return;
    const line = document.createElement('span');
    line.className = `run-line-${kind === 'error' ? 'error' : kind === 'info' ? 'info' : kind === 'warn' ? 'warn' : 'log'}`;
    line.textContent = `${text}\n`;
    els.runOutput.appendChild(line);
    els.runOutput.scrollTop = els.runOutput.scrollHeight;
}

function runEditorSnippet() {
    const code = els.code.value;
    if (!code.trim()) {
        showNotification('Add some code first');
        return;
    }
    runSnippet(code, resolvedLanguage());
}

async function runSnippet(code, language) {
    if (runBusy) return;
    const lang = language === 'auto' ? detectLanguage(code) : language;
    showRunPanel();
    clearRunOutput();
    if (!RUNNABLE.has(lang)) {
        appendRun('info', `${capitalize(lang) || 'This language'} cannot run in the browser.`);
        appendRun('info', 'Supported: JavaScript, Python (WebAssembly), HTML, CSS, and JSON.');
        return;
    }
    runBusy = true;
    if (els.runBtn) els.runBtn.disabled = true;
    appendRun('info', `Running ${lang}…`);
    try {
        if (lang === 'javascript') await runJavaScript(code);
        else if (lang === 'python') await runPython(code);
        else if (lang === 'json') runJson(code);
        else if (lang === 'html') runHtml(code);
        else if (lang === 'css') runCss(code);
    } catch (err) {
        appendRun('error', err && err.message ? err.message : String(err));
    } finally {
        runBusy = false;
        if (els.runBtn) els.runBtn.disabled = false;
    }
}

function runJson(code) {
    const parsed = JSON.parse(code);
    appendRun('log', JSON.stringify(parsed, null, 2));
}

function runHtml(code) {
    els.runFrame.classList.remove('hidden');
    els.runFrame.srcdoc = code;
    appendRun('info', 'Rendered HTML in the frame below (sandboxed).');
}

function runCss(code) {
    els.runFrame.classList.remove('hidden');
    els.runFrame.srcdoc = `<!DOCTYPE html><html><head><style>${code}</style></head>
<body><p class="demo">CSS preview</p><button>Button</button><input value="Input"></body></html>`;
    appendRun('info', 'Applied CSS to a small preview document.');
}

function runJavaScript(code) {
    return new Promise((resolve) => {
        const workerSource = `
self.console = {
  log: (...a) => self.postMessage({type:'log', text: a.map(format).join(' ')}),
  info: (...a) => self.postMessage({type:'log', text: a.map(format).join(' ')}),
  warn: (...a) => self.postMessage({type:'warn', text: a.map(format).join(' ')}),
  error: (...a) => self.postMessage({type:'error', text: a.map(format).join(' ')})
};
function format(v) {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}
try {
  const result = (0, eval)(${JSON.stringify(code)});
  if (result !== undefined) self.postMessage({type:'log', text: format(result)});
} catch (e) {
  self.postMessage({type:'error', text: e && e.stack ? String(e.stack) : String(e)});
}
self.postMessage({type:'done'});
`;
        const blob = new Blob([workerSource], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        const timer = setTimeout(() => {
            worker.terminate();
            URL.revokeObjectURL(url);
            appendRun('error', `Stopped after ${RUN_TIMEOUT_MS / 1000}s (infinite loop or long run).`);
            resolve();
        }, RUN_TIMEOUT_MS);
        worker.onmessage = (ev) => {
            const msg = ev.data || {};
            if (msg.type === 'done') {
                clearTimeout(timer);
                worker.terminate();
                URL.revokeObjectURL(url);
                resolve();
                return;
            }
            appendRun(msg.type || 'log', msg.text);
        };
        worker.onerror = (ev) => {
            clearTimeout(timer);
            worker.terminate();
            URL.revokeObjectURL(url);
            appendRun('error', ev.message || 'Worker error');
            resolve();
        };
    });
}

function loadPyodideRuntime() {
    if (pyodideLoader) return pyodideLoader;
    pyodideLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
        script.onload = () => {
            loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
                .then(resolve)
                .catch(reject);
        };
        script.onerror = () => reject(new Error('Could not load the Python runtime. Check your network.'));
        document.head.appendChild(script);
    });
    return pyodideLoader;
}

async function runPython(code) {
    appendRun('info', 'Loading Python (first run can take a few seconds)…');
    const pyodide = await loadPyodideRuntime();
    pyodide.globals.set('_codeshare_src', code);
    const output = await pyodide.runPythonAsync(`
import sys, io, traceback
buf = io.StringIO()
_stdout, _stderr = sys.stdout, sys.stderr
sys.stdout = buf
sys.stderr = buf
try:
    exec(_codeshare_src, {"__name__": "__main__"})
except Exception:
    traceback.print_exc()
finally:
    sys.stdout = _stdout
    sys.stderr = _stderr
buf.getvalue()
`);
    if (output) appendRun('log', String(output).replace(/\n$/, ''));
    else appendRun('info', 'Finished with no output. Use print() to see results.');
}

const INDENT_UNIT = '    ';

function setEditorValue(ta, next, cursorStart, cursorEnd = cursorStart) {
    const scroll = ta.scrollTop;
    ta.value = next;
    ta.selectionStart = cursorStart;
    ta.selectionEnd = cursorEnd;
    ta.scrollTop = scroll;
}

function leadingIndent(text) {
    const match = text.match(/^[ \t]*/);
    return match ? match[0] : '';
}

function lineBounds(value, pos) {
    const start = value.lastIndexOf('\n', pos - 1) + 1;
    const nl = value.indexOf('\n', pos);
    const end = nl === -1 ? value.length : nl;
    return { start, end };
}

function wantsExtraIndent(lineBeforeCursor) {
    const trimmed = lineBeforeCursor.replace(/\/\/.*$/, '').replace(/#.*$/, '').trimEnd();
    if (!trimmed) return false;
    return /[:{\[(]\s*$/.test(trimmed) || /=>\s*$/.test(trimmed);
}

function stripOneIndent(indent) {
    if (indent.endsWith(INDENT_UNIT)) return indent.slice(0, -INDENT_UNIT.length);
    if (indent.endsWith('\t')) return indent.slice(0, -1);
    if (indent.endsWith(' ')) return indent.replace(/ +$/, '');
    return indent;
}

function indentRange(value, start, end, outdent) {
    const from = value.lastIndexOf('\n', start - 1) + 1;
    const toNl = value.indexOf('\n', end);
    const to = end > start && value[end - 1] === '\n' ? end - 1 : (toNl === -1 ? value.length : toNl);
    const block = value.slice(from, to);
    const lines = block.split('\n');
    const nextLines = lines.map((line) => {
        if (outdent) {
            if (line.startsWith(INDENT_UNIT)) return line.slice(INDENT_UNIT.length);
            if (line.startsWith('\t')) return line.slice(1);
            return line.replace(/^ {1,4}/, '');
        }
        return line.length ? INDENT_UNIT + line : line;
    });
    const nextBlock = nextLines.join('\n');
    const next = value.slice(0, from) + nextBlock + value.slice(to);
    const deltaFirst = nextLines[0].length - lines[0].length;
    const deltaAll = nextBlock.length - block.length;
    return {
        next,
        selStart: Math.max(from, start + deltaFirst),
        selEnd: Math.max(from, end + deltaAll)
    };
}

function handleEditorKeys(e, ta) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        runEditorSnippet();
        return false;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        els.form.requestSubmit();
        return false;
    }

    const value = ta.value;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (e.key === 'Tab') {
        e.preventDefault();
        const multi = start !== end && value.slice(start, end).includes('\n');
        if (multi || e.shiftKey) {
            const result = indentRange(value, start, end, e.shiftKey);
            setEditorValue(ta, result.next, result.selStart, result.selEnd);
        } else {
            setEditorValue(ta, value.slice(0, start) + INDENT_UNIT + value.slice(end), start + INDENT_UNIT.length);
        }
        return true;
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const before = value.slice(0, start);
        const after = value.slice(end);
        const lineBegin = before.lastIndexOf('\n') + 1;
        const lineBeforeCursor = before.slice(lineBegin);
        const indent = leadingIndent(lineBeforeCursor);
        const extra = wantsExtraIndent(lineBeforeCursor) ? INDENT_UNIT : '';
        const restLine = after.split('\n')[0];
        if (extra && /^\s*[}\])]\s*$/.test(restLine)) {
            const insert = `\n${indent}${extra}\n${indent}`;
            setEditorValue(ta, before + insert + after, start + 1 + indent.length + extra.length);
        } else {
            const insert = `\n${indent}${extra}`;
            setEditorValue(ta, before + insert + after, start + insert.length);
        }
        return true;
    }

    if ((e.key === '}' || e.key === ']' || e.key === ')') && start === end) {
        const { start: ls, end: le } = lineBounds(value, start);
        const line = value.slice(ls, le);
        const indent = leadingIndent(line);
        const typedSoFar = value.slice(ls, start);
        if (typedSoFar === indent && indent.length) {
            e.preventDefault();
            const nextIndent = stripOneIndent(indent);
            const nextLine = nextIndent + e.key + value.slice(start, le);
            setEditorValue(ta, value.slice(0, ls) + nextLine + value.slice(le), ls + nextIndent.length + 1);
            return true;
        }
    }

    return false;
}

function onLibraryClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.snippet-card');
    const snippet = snippets.find((s) => String(s.id) === card.dataset.id);
    if (!snippet) return;
    const act = btn.dataset.act;
    if (act === 'run') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        runSnippet(snippet.code, snippet.language);
    }
    if (act === 'copy') copyText(snippet.code, 'Copied code');
    if (act === 'download') downloadSnippet(snippet);
    if (act === 'link') {
        const url = `${location.origin}${location.pathname}#${snippet.id}`;
        copyText(url, 'Link copied');
        location.hash = snippet.id;
    }
    if (act === 'duplicate') {
        els.title.value = `${snippet.title} (copy)`;
        els.code.value = snippet.code;
        els.language.value = snippet.language;
        detectedLanguage = snippet.language;
        updateDetectedBadge(capitalize(snippet.language), false);
        updatePreview();
        els.code.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (act === 'expand') card.classList.toggle('collapsed');
    if (act === 'delete') askDelete(snippet.id, snippet.title);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadLocal();
    renderSnippets();
    updatePreview();

    els.form.addEventListener('submit', handleSubmit);
    document.getElementById('btn-run').addEventListener('click', runEditorSnippet);
    document.getElementById('btn-clear-output').addEventListener('click', () => {
        clearRunOutput();
        els.runPanel.classList.add('hidden');
    });
    document.getElementById('btn-detect').addEventListener('click', runDetect);
    document.getElementById('btn-example').addEventListener('click', () => {
        els.title.value = EXAMPLE.title;
        els.code.value = EXAMPLE.code;
        els.language.value = 'auto';
        runDetect();
        updatePreview();
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
        els.form.reset();
        detectedLanguage = 'plaintext';
        updateDetectedBadge('Waiting for code…', true);
        updatePreview();
    });
    els.themeBtn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    });
    els.wrapBtn.addEventListener('click', () => {
        wrapOn = !wrapOn;
        els.wrapBtn.textContent = wrapOn ? 'Unwrap lines' : 'Wrap lines';
        updatePreview();
        renderSnippets();
    });

    let timer;
    els.code.addEventListener('input', () => {
        updatePreview();
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (els.code.value.trim().length > 8) runDetect();
        }, 280);
    });
    els.title.addEventListener('input', updatePreview);
    els.language.addEventListener('change', updatePreview);
    els.search.addEventListener('input', renderSnippets);
    els.filter.addEventListener('change', renderSnippets);
    els.sort.addEventListener('change', renderSnippets);
    els.container.addEventListener('click', onLibraryClick);

    els.confirmNo.addEventListener('click', closeModal);
    els.confirmYes.addEventListener('click', () => {
        const id = pendingDeleteId;
        closeModal();
        if (id) deleteSnippet(id);
    });
    els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal) closeModal();
    });

    els.code.addEventListener('keydown', (e) => {
        if (handleEditorKeys(e, els.code)) updatePreview();
    });

    window.addEventListener('hashchange', renderSnippets);
    if (location.hash) {
        const target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
