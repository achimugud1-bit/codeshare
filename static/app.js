/**
 * CodeShare Frontend Application
 * Handles form submission, language detection, and snippet display
 */

// DOM Elements
const snippetForm = document.getElementById('snippet-form');
const codeInput = document.getElementById('code');
const titleInput = document.getElementById('title');
const languageSelect = document.getElementById('language-select');
const detectedLanguageEl = document.getElementById('detected-language');
const previewSection = document.getElementById('preview-section');
const previewTitle = document.getElementById('preview-title');
const previewLanguage = document.getElementById('preview-language');
const previewCode = document.getElementById('preview-code');
const snippetsContainer = document.getElementById('snippets-container');
const btnDetect = document.getElementById('btn-detect');

// State
let currentDetectedLanguage = 'plaintext';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadSnippets();
    setupEventListeners();
});

/**
 * Set up event listeners for interactive elements
 */
function setupEventListeners() {
    // Form submission
    snippetForm.addEventListener('submit', handleFormSubmit);

    // Manual language detection button
    btnDetect.addEventListener('click', detectLanguage);

    // Auto-detect on code input (debounced)
    let debounceTimer;
    codeInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (codeInput.value.trim().length > 10) {
                detectLanguage();
            }
        }, 500);
    });

    // Language selector change - update preview if visible
    languageSelect.addEventListener('change', () => {
        if (codeInput.value.trim() && !previewSection.classList.contains('hidden')) {
            updatePreview();
        }
    });
}

/**
 * Detect the programming language of the entered code
 */
async function detectLanguage() {
    const code = codeInput.value.trim();
    
    if (!code) {
        updateDetectedBadge('No code to analyze', true);
        return;
    }

    try {
        const response = await fetch('/api/detect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            throw new Error('Detection failed');
        }

        const data = await response.json();
        currentDetectedLanguage = data.detected_language;
        
        // Update the badge
        updateDetectedBadge(capitalizeFirst(currentDetectedLanguage));

        // If auto is selected, update the dropdown
        if (languageSelect.value === 'auto') {
            languageSelect.value = currentDetectedLanguage;
        }

    } catch (error) {
        console.error('Error detecting language:', error);
        updateDetectedBadge('Detection failed', true);
    }
}

/**
 * Update the detected language badge
 */
function updateDetectedBadge(text, isEmpty = false) {
    detectedLanguageEl.textContent = text;
    detectedLanguageEl.classList.toggle('empty', isEmpty);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const title = titleInput.value.trim() || 'Untitled Snippet';
    const code = codeInput.value.trim();
    let language = languageSelect.value;

    if (!code) {
        alert('Please enter some code to share.');
        return;
    }

    // Use detected language if auto is selected
    if (language === 'auto') {
        language = currentDetectedLanguage || 'plaintext';
    }

    try {
        const response = await fetch('/api/snippets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                code,
                language
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create snippet');
        }

        const data = await response.json();
        
        // Reset form
        snippetForm.reset();
        previewSection.classList.add('hidden');
        updateDetectedBadge('Not detected yet', true);
        currentDetectedLanguage = 'plaintext';

        // Reload snippets
        loadSnippets();

        // Show success message
        showNotification('Snippet shared successfully!', 'success');

    } catch (error) {
        console.error('Error creating snippet:', error);
        alert('Failed to share snippet. Please try again.');
    }
}

/**
 * Load and display all snippets
 */
async function loadSnippets() {
    try {
        const response = await fetch('/api/snippets');
        
        if (!response.ok) {
            throw new Error('Failed to load snippets');
        }

        const data = await response.json();
        renderSnippets(data.snippets);

    } catch (error) {
        console.error('Error loading snippets:', error);
        snippetsContainer.innerHTML = '<p class="no-snippets">Failed to load snippets.</p>';
    }
}

/**
 * Render snippets to the DOM
 */
function renderSnippets(snippets) {
    if (!snippets || snippets.length === 0) {
        snippetsContainer.innerHTML = '<p class="no-snippets">No snippets shared yet. Be the first!</p>';
        return;
    }

    snippetsContainer.innerHTML = snippets.map(snippet => `
        <div class="snippet-card">
            <div class="snippet-header">
                <span class="snippet-title">${escapeHtml(snippet.title)}</span>
                <div class="snippet-meta">
                    <span class="snippet-language">${escapeHtml(snippet.language)}</span>
                    <span class="snippet-date">${formatDate(snippet.created_at)}</span>
                </div>
            </div>
            <div class="snippet-body">
                <pre><code>${snippet.highlighted_code}</code></pre>
            </div>
        </div>
    `).join('');
}

/**
 * Update the preview section with current code
 */
async function updatePreview() {
    const title = titleInput.value.trim() || 'Untitled Snippet';
    const code = codeInput.value.trim();
    const language = languageSelect.value === 'auto' 
        ? currentDetectedLanguage 
        : languageSelect.value;

    if (!code) {
        previewSection.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch('/api/highlight', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, language })
        });

        if (!response.ok) {
            throw new Error('Failed to highlight code');
        }

        const data = await response.json();

        previewTitle.textContent = title;
        previewLanguage.textContent = capitalizeFirst(language);
        previewCode.innerHTML = data.highlighted_code;
        previewSection.classList.remove('hidden');

    } catch (error) {
        console.error('Error updating preview:', error);
        previewSection.classList.add('hidden');
    }
}

/**
 * Show a notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : '#4a90d9'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility: Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Utility: Format date string
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
