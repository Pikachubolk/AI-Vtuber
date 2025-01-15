export function initializeMessages() {
    const panel = document.getElementById('messages');
    panel.innerHTML = `
        <div class="panel-content">
            <div class="messages-list">
                <!-- Messages will be added here -->
            </div>
        </div>
    `;
} 