Technical Architecture
Real-time Communication
WebSocket Protocol: Custom protocol for drawing events

Room Management: Supports multiple collaborative rooms

Event Synchronization: Conflict-free simultaneous drawing

Drawing Engine
Multi-layer Canvas: Separate layers for drawing, cursors, and UI

Tool System: Extensible tool architecture

Performance: Optimized redraw and rendering pipeline

Data Flow
User draws on local canvas

Stroke data sent to server via WebSocket

Server broadcasts to all connected clients

Each client renders the stroke in real-time

API Reference
WebSocket Events
Drawing Events
draw-start: Begin new stroke

draw-move: Continue stroke

draw-end: Complete stroke

draw-shape: Add geometric shapes

clear-canvas: Reset canvas

User Events
user-joined: New user connected

user-left: User disconnected

cursor-move: Update cursor position

Development
Adding New Tools
Extend the DrawingCanvas class

Implement tool-specific event handlers

Add UI controls in index.html

Update WebSocket event handling

Customization
Modify style.css for theme changes

Adjust canvas dimensions in client-side code

Configure server settings in server.js

Performance Considerations
Optimized for up to 50 concurrent users

Efficient stroke data compression

Smart canvas redraw strategies

Memory-efficient stroke caching

Browser Support
Chrome 60+

Firefox 55+

Safari 12+

Edge 79+

Mobile Support
Touch event handling

Responsive UI design

Mobile-optimized controls

Gesture support for zoom/pan

Troubleshooting
Common Issues
No real-time updates

Check WebSocket connection status

Verify server is running

Check browser console for errors

Drawing lag

Reduce number of concurrent users

Simplify complex drawings

Check network connectivity

Tools not working

Refresh the page

Check JavaScript console for errors

Verify browser compatibility

Contributing
Fork the repository

Create a feature branch

Make your changes

Test with multiple clients

Submit a pull request

License
This project is licensed under the MIT License - see the LICENSE file for details.