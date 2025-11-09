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
        roomState.undoneStrokes = []; // Clear redo stack on new action
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
    
    getStrokeHistory(roomId) {
        const roomState = this.getRoomState(roomId);
        return roomState.strokes;
    }
    
    getRoomVersion(roomId) {
        const roomState = this.getRoomState(roomId);
        return roomState.version;
    }
}

module.exports = DrawingManager;