# FLAM-CANVA
Collaborative Canvas Pro is a real-time, multi-user digital drawing platform that enables artists, designers, teams, and friends to create together simultaneously on a shared virtual canvas. Built with modern web technologies, it provides a professional-grade drawing experience with real-time synchronization, making remote collaborate.



A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas.

Features
Real-time Drawing: See other users draw as they draw

Multiple Tools: Pencil, brush, eraser, and fill tools

Live Cursors: See where other users are currently drawing

Global Undo/Redo: Undo and redo actions across all users

User Management: Color-coded users with live status

Mobile Support: Touch-enabled drawing interface

Performance: 60 FPS with smooth drawing experience

Quick Start
Prerequisites
Node.js (v14 or higher)

npm

Installation
Clone or download the project files

Navigate to the project directory

Install dependencies:

bash
npm install
Start the server:

bash
npm start
Open your browser and navigate to https://flam-canva5d4176.netlify.app/

Testing with Multiple Users
Open multiple browser windows/tabs to https://flam-canva5d4176.netlify.app/

Enter different usernames for each session

Start drawing - you'll see real-time updates across all windows

Test different tools and watch the collaboration in action!

Project Structure
collaborative-canvas/
├── client/                 # Frontend application
│   ├── index.html         # Main HTML file
│   ├── style.css          # Comprehensive styling
│   ├── main.js            # Application entry point
│   ├── canvas.js          # DrawingCanvas class (core engine)
│   └── websocket.js       # SocketManager class
├── server/                # Backend server
│   ├── server.js          # Main server file
│   ├── room-manager.js    # Room and user management
│   └── drawing-manager.js # Drawing state management
├── package.json           # Dependencies and scripts
└── README.md              # This documentation

