const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.users = new Map();
        this.savedCanvases = new Map(); // Store saved canvases
        this.initializeDefaultRoom();
    }
    
    initializeDefaultRoom() {
        this.rooms.set('default', {
            id: 'default',
            users: new Set(),
            createdAt: new Date(),
            settings: {
                maxUsers: 50,
                allowGuests: true,
                canvasWidth: 1600,
                canvasHeight: 900
            }
        });
    }
    
    generateUserColor() {
        const colors = [
            '#ff4757', '#2ed573', '#1e90ff', '#ffa502', 
            '#a55eea', '#ff6348', '#3742fa', '#fffa65',
            '#fd79a8', '#00d2d3', '#54a0ff', '#5f27cd'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    addUser(socketId, roomId = 'default') {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} not found`);
        }
        
        if (room.users.size >= room.settings.maxUsers) {
            throw new Error(`Room ${roomId} is full`);
        }
        
        const user = {
            id: socketId,
            color: this.generateUserColor(),
            cursor: { x: 0, y: 0 },
            roomId: roomId,
            joinedAt: new Date(),
            name: `Artist${Math.floor(Math.random() * 1000)}`,
            isGuest: true
        };
        
        this.users.set(socketId, user);
        room.users.add(socketId);
        
        console.log(`User ${socketId} (${user.name}) joined room ${roomId}`);
        return user;
    }
    
    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            const room = this.rooms.get(user.roomId);
            if (room) {
                room.users.delete(socketId);
            }
            this.users.delete(socketId);
            console.log(`User ${socketId} (${user.name}) left room ${user.roomId}`);
        }
    }
    
    updateUserCursor(socketId, cursor) {
        const user = this.users.get(socketId);
        if (user) {
            user.cursor = cursor;
            return user;
        }
        return null;
    }
    
    updateUserName(socketId, name) {
        const user = this.users.get(socketId);
        if (user) {
            user.name = name;
            user.isGuest = false;
            return user;
        }
        return null;
    }
    
    getRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.users).map(userId => this.users.get(userId)).filter(Boolean);
    }
    
    getUser(socketId) {
        return this.users.get(socketId);
    }
    
    // Canvas saving functionality
    saveCanvas(canvasId, canvasData) {
        const saveData = {
            id: canvasId,
            name: canvasData.name || `Canvas_${new Date().toISOString().split('T')[0]}`,
            data: canvasData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.savedCanvases.set(canvasId, saveData);
        
        // Also save to file system for persistence
        this.saveCanvasToFile(canvasId, saveData);
        
        console.log(`Canvas saved: ${canvasId}`);
        return saveData;
    }
    
    loadCanvas(canvasId) {
        let canvasData = this.savedCanvases.get(canvasId);
        
        if (!canvasData) {
            // Try to load from file system
            canvasData = this.loadCanvasFromFile(canvasId);
        }
        
        return canvasData;
    }
    
    getAllSavedCanvases() {
        const canvases = Array.from(this.savedCanvases.values());
        
        // Also load from file system
        const fileCanvases = this.loadAllCanvasesFromFiles();
        fileCanvases.forEach(canvas => {
            if (!this.savedCanvases.has(canvas.id)) {
                this.savedCanvases.set(canvas.id, canvas);
                canvases.push(canvas);
            }
        });
        
        return canvases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    
    deleteCanvas(canvasId) {
        this.savedCanvases.delete(canvasId);
        this.deleteCanvasFile(canvasId);
        console.log(`Canvas deleted: ${canvasId}`);
    }
    
    // File system operations
    saveCanvasToFile(canvasId, canvasData) {
        try {
            const savesDir = path.join(__dirname, 'saves');
            if (!fs.existsSync(savesDir)) {
                fs.mkdirSync(savesDir, { recursive: true });
            }
            
            const filePath = path.join(savesDir, `${canvasId}.json`);
            fs.writeFileSync(filePath, JSON.stringify(canvasData, null, 2));
        } catch (error) {
            console.error('Error saving canvas to file:', error);
        }
    }
    
    loadCanvasFromFile(canvasId) {
        try {
            const filePath = path.join(__dirname, 'saves', `${canvasId}.json`);
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading canvas from file:', error);
        }
        return null;
    }
    
    loadAllCanvasesFromFiles() {
        const canvases = [];
        try {
            const savesDir = path.join(__dirname, 'saves');
            if (fs.existsSync(savesDir)) {
                const files = fs.readdirSync(savesDir);
                files.forEach(file => {
                    if (file.endsWith('.json')) {
                        const canvasId = file.replace('.json', '');
                        const canvasData = this.loadCanvasFromFile(canvasId);
                        if (canvasData) {
                            canvases.push(canvasData);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading canvases from files:', error);
        }
        return canvases;
    }
    
    deleteCanvasFile(canvasId) {
        try {
            const filePath = path.join(__dirname, 'saves', `${canvasId}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Error deleting canvas file:', error);
        }
    }
}

class DrawingManager {
    constructor() {
        this.roomStates = new Map();
        this.initializeDefaultRoom();
    }
    
    initializeDefaultRoom() {
        this.roomStates.set('default', {
            strokes: [],
            undoneStrokes: [],
            currentStrokes: new Map(),
            canvasState: 'clean',
            version: 1
        });
    }
    
    startStroke(roomId, userId, startPoint) {
        const roomState = this.getRoomState(roomId);
        const stroke = {
            id: startPoint.strokeId || `${Date.now()}-${userId}-${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            points: [startPoint],
            color: startPoint.color || '#000000',
            width: startPoint.width || 3,
            tool: startPoint.tool || 'pencil',
            startTime: new Date(),
            type: 'stroke'
        };
        
        roomState.currentStrokes.set(userId, stroke);
        roomState.strokes.push(stroke);
        roomState.undoneStrokes = [];
        roomState.version++;
        
        console.log(`Stroke started: ${stroke.id} by user ${userId}`);
        return stroke;
    }
    
    addStrokePoint(roomId, userId, point) {
        const roomState = this.getRoomState(roomId);
        const stroke = roomState.currentStrokes.get(userId);
        
        if (stroke) {
            stroke.points.push(point);
            roomState.version++;
            return {
                strokeId: stroke.id,
                point: point
            };
        }
        return null;
    }
    
    endStroke(roomId, userId) {
        const roomState = this.getRoomState(roomId);
        roomState.currentStrokes.delete(userId);
        roomState.version++;
        console.log(`Stroke ended by user ${userId}`);
    }
    
    clearCanvas(roomId) {
        const roomState = this.getRoomState(roomId);
        const clearAction = {
            id: `clear-${Date.now()}`,
            type: 'clear',
            userId: 'system',
            timestamp: new Date()
        };
        
        roomState.strokes.push(clearAction);
        roomState.undoneStrokes = [];
        roomState.version++;
        console.log(`Canvas cleared in room ${roomId}`);
    }
    
    undo(roomId) {
        const roomState = this.getRoomState(roomId);
        if (roomState.strokes.length > 0) {
            const lastStroke = roomState.strokes.pop();
            roomState.undoneStrokes.push(lastStroke);
            roomState.version++;
            console.log(`Undo: ${lastStroke.id} in room ${roomId}`);
            return lastStroke;
        }
        console.log(`Nothing to undo in room ${roomId}`);
        return null;
    }
    
    redo(roomId) {
        const roomState = this.getRoomState(roomId);
        if (roomState.undoneStrokes.length > 0) {
            const redoneStroke = roomState.undoneStrokes.pop();
            roomState.strokes.push(redoneStroke);
            roomState.version++;
            console.log(`Redo: ${redoneStroke.id} in room ${roomId}`);
            return redoneStroke;
        }
        console.log(`Nothing to redo in room ${roomId}`);
        return null;
    }
    
    getRoomState(roomId) {
        if (!this.roomStates.has(roomId)) {
            this.roomStates.set(roomId, {
                strokes: [],
                undoneStrokes: [],
                currentStrokes: new Map(),
                canvasState: 'clean',
                version: 1
            });
        }
        return this.roomStates.get(roomId);
    }
    
    loadRoomState(roomId, stateData) {
        this.roomStates.set(roomId, stateData);
        console.log(`Room state loaded for ${roomId}`);
    }
}

class CollaborativeCanvasServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.roomManager = new RoomManager();
        this.drawingManager = new DrawingManager();
        
        this.setupStaticFiles();
        this.setupRoutes();
        this.setupSocketHandlers();
    }
    
    setupStaticFiles() {
        this.app.use(express.static(path.join(__dirname, '../client')));
        this.app.use(express.json());
        
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/index.html'));
        });
    }
    
    setupRoutes() {
        // API routes for canvas saving/loading
        this.app.get('/api/canvases', (req, res) => {
            const canvases = this.roomManager.getAllSavedCanvases();
            res.json(canvases);
        });
        
        this.app.post('/api/canvases/save', (req, res) => {
            const { name, data } = req.body;
            const canvasId = uuidv4();
            
            const savedCanvas = this.roomManager.saveCanvas(canvasId, {
                name,
                data,
                roomState: this.drawingManager.getRoomState('default')
            });
            
            res.json(savedCanvas);
        });
        
        this.app.get('/api/canvases/:id', (req, res) => {
            const canvasId = req.params.id;
            const canvasData = this.roomManager.loadCanvas(canvasId);
            
            if (canvasData) {
                res.json(canvasData);
            } else {
                res.status(404).json({ error: 'Canvas not found' });
            }
        });
        
        this.app.delete('/api/canvases/:id', (req, res) => {
            const canvasId = req.params.id;
            this.roomManager.deleteCanvas(canvasId);
            res.json({ success: true });
        });
        
        this.app.post('/api/canvases/:id/load', (req, res) => {
            const canvasId = req.params.id;
            const canvasData = this.roomManager.loadCanvas(canvasId);
            
            if (canvasData && canvasData.roomState) {
                this.drawingManager.loadRoomState('default', canvasData.roomState);
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Canvas not found or invalid data' });
            }
        });
    }
    
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);
            
            const roomId = 'default';
            const user = this.roomManager.addUser(socket.id, roomId);
            
            const roomState = this.drawingManager.getRoomState(roomId);
            const users = this.roomManager.getRoomUsers(roomId);
            
            socket.emit('init', {
                roomState,
                users,
                currentUser: user
            });
            
            socket.join(roomId);
            
            socket.to(roomId).emit('user-joined', user);
            
            socket.on('user-name', (userName) => {
                const updatedUser = this.roomManager.updateUserName(socket.id, userName);
                if (updatedUser) {
                    socket.to(roomId).emit('user-name-update', {
                        userId: socket.id,
                        name: userName
                    });
                }
            });
            
            socket.on('draw-start', (data) => {
                this.handleDrawStart(socket, roomId, data);
            });
            
            socket.on('draw-move', (data) => {
                this.handleDrawMove(socket, roomId, data);
            });
            
            socket.on('draw-end', (data) => {
                this.handleDrawEnd(socket, roomId, data);
            });
            
            socket.on('draw-shape', (shapeData) => {
                this.handleDrawShape(socket, roomId, shapeData);
            });
            
            socket.on('fill-area', (fillData) => {
                this.handleFillArea(socket, roomId, fillData);
            });
            
            socket.on('add-text', (textData) => {
                this.handleAddText(socket, roomId, textData);
            });
            
            socket.on('add-image', (imageData) => {
                this.handleAddImage(socket, roomId, imageData);
            });
            
            socket.on('cursor-move', (data) => {
                this.handleCursorMove(socket, roomId, data);
            });
            
            socket.on('clear-canvas', () => {
                this.handleClearCanvas(socket, roomId);
            });
            
            socket.on('undo-request', () => {
                this.handleUndo(socket, roomId);
            });
            
            socket.on('redo-request', () => {
                this.handleRedo(socket, roomId);
            });
            
            socket.on('disconnect', () => {
                this.handleDisconnect(socket, roomId);
            });
        });
    }
    
    handleDrawStart(socket, roomId, data) {
        const stroke = this.drawingManager.startStroke(roomId, socket.id, data);
        socket.to(roomId).emit('draw-start', stroke);
    }
    
    handleDrawMove(socket, roomId, data) {
        const strokeData = this.drawingManager.addStrokePoint(roomId, socket.id, data);
        if (strokeData) {
            socket.to(roomId).emit('draw-move', strokeData);
        }
    }
    
    handleDrawEnd(socket, roomId, data) {
        this.drawingManager.endStroke(roomId, socket.id);
        socket.to(roomId).emit('draw-end', data);
    }
    
    handleDrawShape(socket, roomId, shapeData) {
        const roomState = this.drawingManager.getRoomState(roomId);
        const shape = {
            ...shapeData,
            userId: socket.id,
            type: 'shape',
            timestamp: new Date()
        };
        roomState.strokes.push(shape);
        socket.to(roomId).emit('draw-shape', shape);
    }
    
    handleFillArea(socket, roomId, fillData) {
        const fillAction = {
            ...fillData,
            userId: socket.id,
            type: 'fill',
            timestamp: new Date()
        };
        
        const roomState = this.drawingManager.getRoomState(roomId);
        roomState.strokes.push(fillAction);
        
        socket.to(roomId).emit('fill-area', fillAction);
    }
    
    handleAddText(socket, roomId, textData) {
        const textAction = {
            ...textData,
            userId: socket.id,
            type: 'text',
            timestamp: new Date()
        };
        
        const roomState = this.drawingManager.getRoomState(roomId);
        roomState.strokes.push(textAction);
        
        socket.to(roomId).emit('add-text', textAction);
    }
    
    handleAddImage(socket, roomId, imageData) {
        const imageAction = {
            ...imageData,
            userId: socket.id,
            type: 'image',
            timestamp: new Date()
        };
        
        const roomState = this.drawingManager.getRoomState(roomId);
        roomState.strokes.push(imageAction);
        
        socket.to(roomId).emit('add-image', imageAction);
    }
    
    handleCursorMove(socket, roomId, data) {
        const user = this.roomManager.updateUserCursor(socket.id, data);
        if (user) {
            socket.to(roomId).emit('cursor-move', {
                userId: socket.id,
                cursor: data,
                color: user.color,
                name: user.name
            });
        }
    }
    
    handleClearCanvas(socket, roomId) {
        this.drawingManager.clearCanvas(roomId);
        this.io.to(roomId).emit('canvas-cleared');
    }
    
    handleUndo(socket, roomId) {
        const undoneStroke = this.drawingManager.undo(roomId);
        if (undoneStroke) {
            this.io.to(roomId).emit('stroke-undone', undoneStroke.id);
        }
    }
    
    handleRedo(socket, roomId) {
        const redoneStroke = this.drawingManager.redo(roomId);
        if (redoneStroke) {
            socket.to(roomId).emit('stroke-redone', redoneStroke);
        }
    }
    
    handleDisconnect(socket, roomId) {
        console.log('User disconnected:', socket.id);
        this.roomManager.removeUser(socket.id);
        socket.to(roomId).emit('user-left', socket.id);
    }
    
    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`🎨 Collaborative Canvas Server running on port ${port}`);
            console.log(`👉 Open http://localhost:${port} in multiple browsers to test collaboration`);
        });
    }
}

// Install required package: npm install uuid
const server = new CollaborativeCanvasServer();
server.start(process.env.PORT || 3000);