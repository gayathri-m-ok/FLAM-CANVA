class CollaborativeCanvasApp {
    constructor() {
        this.drawingCanvas = null;
        this.socketManager = null;
        this.userName = '';
        this.init();
    }
    
    init() {
        this.showUsernameModal();
    }
    
    showUsernameModal() {
        const modal = document.getElementById('username-modal');
        const input = document.getElementById('username-input');
        const submitBtn = document.getElementById('username-submit');
        
        // Show modal
        modal.style.display = 'flex';
        input.focus();
        
        const handleSubmit = () => {
            const name = input.value.trim();
            if (name) {
                this.userName = name;
                modal.style.display = 'none';
                this.startApplication();
            } else {
                alert('Please enter your name to continue.');
            }
        };
        
        submitBtn.addEventListener('click', handleSubmit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
    }
    
    startApplication() {
        console.log('Starting Collaborative Canvas Application...');
        
        // Initialize drawing canvas
        this.drawingCanvas = new DrawingCanvas();
        window.drawingCanvas = this.drawingCanvas;
        
        // Initialize socket manager with user name
        this.socketManager = new SocketManager(this.userName);
        window.socketManager = this.socketManager;
        
        console.log('🎨 Collaborative Canvas initialized successfully');
        
        // Auto-hide welcome message after 3 seconds
        setTimeout(() => {
            this.drawingCanvas.hideWelcomeMessage();
        }, 3000);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CollaborativeCanvasApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    console.log('Closing Collaborative Canvas...');
    if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.disconnect();
    }
});