/**
 * WebSocket Manager for Real-time Collaboration
 * Handles all socket communication between clients and server
 */
class SocketManager {
    constructor(userName) {
        this.socket = null;
        this.isConnected = false;
        this.pendingEvents = [];
        this.currentUser = null;
        this.userName = userName;
        this.currentStrokeId = null;
        
        this.connect();
    }
    
    /**
     * Establish connection to WebSocket server
     */
    connect() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.processPendingEvents();
            
            // Send user name to server
            this.socket.emit('user-name', this.userName);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
        });
        
        // Initialize with server state
        this.socket.on('init', (data) => {
            console.log('Received initial state from server');
            this.currentUser = data.currentUser;
            this.handleInit(data);
        });
        
        // Drawing events
        this.socket.on('draw-start', (stroke) => {
            if (window.drawingCanvas && stroke.userId !== this.socket.id) {
                window.drawingCanvas.handleRemoteDrawStart(stroke);
            }
        });
        
        this.socket.on('draw-move', (data) => {
            if (window.drawingCanvas && data.strokeId) {
                window.drawingCanvas.handleRemoteDrawMove(data);
            }
        });
        
        this.socket.on('draw-end', (data) => {
            if (window.drawingCanvas && data.strokeId) {
                window.drawingCanvas.handleRemoteDrawEnd(data.strokeId);
            }
        });
        
        this.socket.on('draw-shape', (shapeData) => {
            if (window.drawingCanvas && shapeData.userId !== this.socket.id) {
                window.drawingCanvas.handleRemoteDrawShape(shapeData);
            }
        });
        
        this.socket.on('fill-area', (fillData) => {
            if (window.drawingCanvas && fillData.userId !== this.socket.id) {
                window.drawingCanvas.handleRemoteFillArea(fillData);
            }
        });
        
        this.socket.on('add-text', (textData) => {
            if (window.drawingCanvas && textData.userId !== this.socket.id) {
                window.drawingCanvas.handleRemoteAddText(textData);
            }
        });
        
        this.socket.on('add-image', (imageData) => {
            if (window.drawingCanvas && imageData.userId !== this.socket.id) {
                window.drawingCanvas.handleRemoteAddImage(imageData);
            }
        });
        
        // Cursor events
        this.socket.on('cursor-move', (data) => {
            if (window.drawingCanvas && data.userId !== this.socket.id) {
                window.drawingCanvas.handleRemoteCursorMove(data.userId, data.cursor, data.color, data.name);
            }
        });
        
        // User management events
        this.socket.on('user-joined', (user) => {
            this.addUserToList(user);
        });
        
        this.socket.on('user-left', (userId) => {
            this.removeUserFromList(userId);
            if (window.drawingCanvas) {
                window.drawingCanvas.handleUserLeft(userId);
            }
        });
        
        this.socket.on('user-name-update', (userData) => {
            this.updateUserName(userData.userId, userData.name);
        });
        
        // Canvas actions
        this.socket.on('canvas-cleared', () => {
            if (window.drawingCanvas) {
                window.drawingCanvas.handleCanvasCleared();
            }
        });
        
        this.socket.on('stroke-undone', (strokeId) => {
            if (window.drawingCanvas) {
                window.drawingCanvas.handleRemoteUndo(strokeId);
            }
        });
        
        this.socket.on('stroke-redone', (stroke) => {
            if (window.drawingCanvas) {
                window.drawingCanvas.handleRemoteRedo(stroke);
            }
        });
        
        // Layer events
        this.socket.on('layer-added', (layer) => {
            if (window.drawingCanvas) {
                window.drawingCanvas.handleLayerAdded(layer);
            }
        });
        
        this.socket.on('active-layer-changed', (layerId) => {
            if (window.drawingCanvas) {
                window.drawingCanvas.handleActiveLayerChanged(layerId);
            }
        });
        
        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError('Connection error: ' + error.message);
        });
        
        // Room events
        this.socket.on('room-full', () => {
            this.showError('Room is full. Please try again later.');
        });
    }
    
    /**
     * Emit drawing start event
     */
    emitDrawStart(coords) {
        this.currentStrokeId = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const eventData = {
            ...coords,
            strokeId: this.currentStrokeId,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('draw-start', eventData);
        } else {
            this.pendingEvents.push({ type: 'draw-start', data: eventData });
        }
    }
    
    /**
     * Emit drawing move event
     */
    emitDrawMove(coords) {
        const eventData = {
            ...coords,
            strokeId: this.currentStrokeId,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('draw-move', eventData);
        } else {
            this.pendingEvents.push({ type: 'draw-move', data: eventData });
        }
    }
    
    /**
     * Emit drawing end event
     */
    emitDrawEnd() {
        const eventData = {
            strokeId: this.currentStrokeId,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('draw-end', eventData);
            this.currentStrokeId = null;
        } else {
            this.pendingEvents.push({ type: 'draw-end', data: eventData });
        }
    }
    
    /**
     * Emit shape drawing event
     */
    emitDrawShape(shapeData) {
        const eventData = {
            ...shapeData,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('draw-shape', eventData);
        } else {
            this.pendingEvents.push({ type: 'draw-shape', data: eventData });
        }
    }
    
    /**
     * Emit fill area event
     */
    emitFillArea(fillData) {
        const eventData = {
            ...fillData,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('fill-area', eventData);
        } else {
            this.pendingEvents.push({ type: 'fill-area', data: eventData });
        }
    }
    
    /**
     * Emit add text event
     */
    emitAddText(textData) {
        const eventData = {
            ...textData,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('add-text', eventData);
        } else {
            this.pendingEvents.push({ type: 'add-text', data: eventData });
        }
    }
    
    /**
     * Emit add image event
     */
    emitAddImage(imageData) {
        const eventData = {
            ...imageData,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('add-image', eventData);
        } else {
            this.pendingEvents.push({ type: 'add-image', data: eventData });
        }
    }
    
    /**
     * Emit cursor movement event
     */
    emitCursorMove(coords) {
        if (this.isConnected) {
            this.socket.emit('cursor-move', {
                ...coords,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Emit clear canvas event
     */
    emitClearCanvas() {
        if (this.isConnected) {
            this.socket.emit('clear-canvas', {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Emit undo request
     */
    emitUndo(strokeId) {
        if (this.isConnected) {
            this.socket.emit('undo-request', {
                strokeId: strokeId,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Emit redo request
     */
    emitRedo(strokeData) {
        if (this.isConnected) {
            this.socket.emit('redo-request', {
                ...strokeData,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Emit add layer event
     */
    emitAddLayer(layerData) {
        if (this.isConnected) {
            this.socket.emit('add-layer', layerData);
        }
    }
    
    /**
     * Emit set active layer event
     */
    emitSetActiveLayer(layerId) {
        if (this.isConnected) {
            this.socket.emit('set-active-layer', layerId);
        }
    }
    
    /**
     * Update user name
     */
    emitUserNameUpdate(newName) {
        if (this.isConnected) {
            this.socket.emit('user-name-update', {
                name: newName,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Update connection status UI
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const indicator = document.getElementById('connection-indicator');
        
        if (statusElement && indicator) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            indicator.className = `indicator ${connected ? 'connected' : 'disconnected'}`;
            
            // Add animation for reconnection
            if (connected) {
                indicator.classList.add('pulse');
                setTimeout(() => indicator.classList.remove('pulse'), 1000);
            }
        }
    }
    
    /**
     * Process pending events after reconnection
     */
    processPendingEvents() {
        console.log(`Processing ${this.pendingEvents.length} pending events`);
        
        while (this.pendingEvents.length > 0) {
            const event = this.pendingEvents.shift();
            try {
                this.socket.emit(event.type, event.data);
            } catch (error) {
                console.error('Failed to send pending event:', error);
                // Re-add failed event to pending queue
                this.pendingEvents.unshift(event);
                break;
            }
        }
    }
    
    /**
     * Handle initial state from server
     */
    handleInit(data) {
        console.log('Initializing with server data:', data);
        
        // Initialize user list
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            
            // Add current user first
            if (this.currentUser) {
                this.addUserToList(this.currentUser, true);
            }
            
            // Add other users
            if (data.users) {
                data.users.forEach(user => {
                    if (user.id !== this.socket.id) {
                        this.addUserToList(user);
                    }
                });
            }
        }
        
        // Initialize layers
        if (window.drawingCanvas && data.roomState) {
            window.drawingCanvas.handleInitialState(data.roomState);
        }
    }
    
    /**
     * Add user to user list
     */
    addUserToList(user, isCurrentUser = false) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        const existingUser = document.getElementById(`user-${user.id}`);
        if (existingUser) return;
        
        const userElement = document.createElement('div');
        userElement.className = `user-item ${isCurrentUser ? 'you' : ''}`;
        userElement.id = `user-${user.id}`;
        userElement.innerHTML = `
            <div class="user-color" style="background-color: ${user.color || '#4CAF50'}"></div>
            <span class="user-name">${user.name || (isCurrentUser ? 'You' : `User ${user.id.slice(-4)}`)}</span>
            ${isCurrentUser ? '<span class="you-badge">You</span>' : ''}
        `;
        
        usersList.appendChild(userElement);
        
        // Update user count
        this.updateUserCount();
        
        // Show join notification
        if (!isCurrentUser) {
            this.showNotification(`${user.name || `User ${user.id.slice(-4)}`} joined the room`);
        }
    }
    
    /**
     * Remove user from user list
     */
    removeUserFromList(userId) {
        const userElement = document.getElementById(`user-${userId}`);
        if (userElement) {
            const userName = userElement.querySelector('.user-name')?.textContent || `User ${userId.slice(-4)}`;
            userElement.remove();
            
            // Update user count
            this.updateUserCount();
            
            // Show leave notification
            this.showNotification(`${userName} left the room`);
        }
    }
    
    /**
     * Update user name in the list
     */
    updateUserName(userId, name) {
        const userElement = document.getElementById(`user-${userId}`);
        if (userElement) {
            const nameElement = userElement.querySelector('.user-name');
            if (nameElement) {
                const oldName = nameElement.textContent;
                nameElement.textContent = name;
                
                // Show name change notification
                if (oldName !== name) {
                    this.showNotification(`${oldName} is now ${name}`);
                }
            }
        }
    }
    
    /**
     * Update user count display
     */
    updateUserCount() {
        const userCount = document.getElementById('user-count');
        const users = document.querySelectorAll('.user-item');
        if (userCount) {
            userCount.textContent = `${users.length} artist${users.length !== 1 ? 's' : ''} online`;
        }
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to notifications container
        const container = document.getElementById('notifications-container') || this.createNotificationsContainer();
        container.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
        
        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
    
    /**
     * Create notifications container if it doesn't exist
     */
    createNotificationsContainer() {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
        console.error('Socket Manager Error:', message);
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
            this.updateConnectionStatus(false);
        }
    }
    
    /**
     * Reconnect to server
     */
    reconnect() {
        if (!this.isConnected) {
            this.disconnect();
            this.connect();
        }
    }
    
    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socket?.id,
            pendingEvents: this.pendingEvents.length
        };
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.disconnect();
        this.pendingEvents = [];
        this.currentStrokeId = null;
        this.currentUser = null;
    }
}