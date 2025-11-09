class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.users = new Map();
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
                canvasWidth: 800,
                canvasHeight: 600
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
        
        // Check room capacity
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
    
    getRoomStats(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        return {
            id: room.id,
            userCount: room.users.size,
            createdAt: room.createdAt,
            settings: room.settings
        };
    }
}

module.exports = RoomManager;