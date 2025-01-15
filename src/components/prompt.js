export function initializePrompt() {
    const panel = document.getElementById('prompt');
    panel.innerHTML = `
        <div class="panel-content">
            <div class="prompt-editor">
                <textarea id="prompt-text" class="prompt-textarea"></textarea>
            </div>
            <div class="button-group">
                <button id="save-prompt">Save Prompt</button>
            </div>
        </div>
    `;

    loadPrompt();
    document.getElementById('save-prompt').addEventListener('click', savePrompt);
}

async function loadPrompt() {
    try {
        const promptText = await window.api.loadPrompt();
        document.getElementById('prompt-text').value = promptText;
    } catch (error) {
        console.error('Failed to load prompt:', error);
    }
}

async function savePrompt() {
    try {
        const promptText = document.getElementById('prompt-text').value;
        await window.api.savePrompt(promptText);
    } catch (error) {
        console.error('Failed to save prompt:', error);
    }
} 