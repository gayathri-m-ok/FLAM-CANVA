/**
 * Collaborative Canvas Drawing Engine
 * Handles all canvas operations, drawing tools, and real-time synchronization
 */
class DrawingCanvas {
    constructor() {
        // Canvas elements and contexts
        this.canvas = null;
        this.ctx = null;
        this.cursorLayer = null;
        this.cursorCtx = null;
        this.selectionLayer = null;
        this.selectionCtx = null;
        this.objectLayer = null;
        this.objectCtx = null;
        this.rulerLayer = null;
        this.rulerCtx = null;
        
        // Drawing state
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.currentColor = '#ff4757';
        this.brushSize = 5;
        this.brushType = 'round';
        this.currentShape = null;
        
        // Position tracking
        this.lastX = 0;
        this.lastY = 0;
        this.startX = 0;
        this.startY = 0;
        
        // Stroke management
        this.currentStroke = null;
        this.localStrokes = new Map();
        this.remoteStrokes = new Map();
        
        // History for undo/redo
        this.strokeHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 100;
        
        // Objects and text management
        this.objects = [];
        this.textElements = [];
        this.images = [];
        this.selectedObject = null;
        
        // Selection state
        this.selectionType = 'rectangle';
        this.isSelecting = false;
        this.isMovingObject = false;
        this.dragOffset = { x: 0, y: 0 };
        this.selectionStart = { x: 0, y: 0 };
        this.selectionEnd = { x: 0, y: 0 };
        
        // Crop state
        this.cropMode = false;
        this.isCropping = false;
        this.cropStartX = 0;
        this.cropStartY = 0;
        this.cropEndX = 0;
        this.cropEndY = 0;
        
        // Text state
        this.textInputActive = false;
        this.textPosition = { x: 0, y: 0 };
        this.editingTextElement = null;
        
        // Ruler state
        this.rulerMode = false;
        this.showRulers = false;
        this.showGrid = false;
        this.showDotted = false;
        this.isDrawingRuler = false;
        this.rulerStart = { x: 0, y: 0 };
        this.rulerEnd = { x: 0, y: 0 };
        
        // Recent colors management
        this.recentColors = [];
        this.maxRecentColors = 8;
        
        // Remote cursors
        this.remoteCursors = new Map();
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Zoom state
        this.zoomLevel = 1;
        
        // Layers
        this.layers = [
            {
                id: 'layer-1',
                name: 'Layer 1',
                visible: true,
                locked: false,
                opacity: 1,
                order: 0
            }
        ];
        this.activeLayer = 'layer-1';
        
        // Temporary shape for preview
        this.tempShape = null;
        
        this.init();
    }
    
    /**
     * Initialize the canvas application
     */
    init() {
        this.createCanvasElements();
        this.setupEventListeners();
        this.setupToolHandlers();
        this.resizeCanvas();
        this.startFpsCounter();
        this.updateDateTime();
        this.initializeRecentColors();
        this.initializeHistory();
        this.initializeRulers();
        this.initializeLayers();
        
        // Update time every second
        setInterval(() => this.updateDateTime(), 1000);
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    /**
     * Update date and time display
     */
    updateDateTime() {
        const now = new Date();
        const dateElement = document.getElementById('current-date');
        const timeElement = document.getElementById('current-time');
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }
    
    /**
     * Create and setup canvas elements
     */
    createCanvasElements() {
        const container = document.querySelector('.canvas-container');
        
        // Main drawing canvas
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.zIndex = '2';
        
        // Cursor overlay canvas
        this.cursorLayer = document.getElementById('cursor-layer');
        this.cursorCtx = this.cursorLayer.getContext('2d');
        this.cursorLayer.style.zIndex = '3';
        
        // Selection overlay canvas
        this.selectionLayer = document.getElementById('selection-layer');
        this.selectionCtx = this.selectionLayer.getContext('2d');
        this.selectionLayer.style.zIndex = '4';
        
        // Object overlay canvas for selection boxes
        this.objectLayer = document.getElementById('object-layer');
        this.objectCtx = this.objectLayer.getContext('2d');
        this.objectLayer.style.zIndex = '5';
        
        // Ruler overlay canvas
        this.rulerLayer = document.getElementById('ruler-layer');
        this.rulerCtx = this.rulerLayer.getContext('2d');
        this.rulerLayer.style.zIndex = '6';
        
        this.setCanvasStyles();
    }
    
    /**
     * Set initial canvas styles and properties
     */
    setCanvasStyles() {
        this.canvas.style.cursor = 'crosshair';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
    }
    
    /**
     * Setup event listeners for user interaction
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseout', this.handleMouseOut.bind(this));
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        
        // Image upload handler
        document.getElementById('image-upload').addEventListener('change', this.handleImageUpload.bind(this));
    }
    
    /**
     * Setup tool button handlers and UI interactions
     */
    setupToolHandlers() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.setTool(tool);
            });
        });
        
        // Color picker
        document.getElementById('color-picker').addEventListener('input', (e) => {
            this.setColor(e.target.value);
        });
        
        // Brush type selector
        document.getElementById('brush-type').addEventListener('change', (e) => {
            this.setBrushType(e.target.value);
        });
        
        // Brush size
        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.setBrushSize(parseInt(e.target.value));
        });
        
        // Selection dropdown
        const selectToggle = document.getElementById('select-toggle');
        const selectOptions = document.getElementById('select-options');
        
        if (selectToggle && selectOptions) {
            selectToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                selectOptions.classList.toggle('hidden');
                selectToggle.classList.toggle('active');
            });
            
            document.querySelectorAll('.select-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const selectionType = e.currentTarget.dataset.selection;
                    this.setSelectionType(selectionType);
                    selectOptions.classList.add('hidden');
                    selectToggle.classList.remove('active');
                });
            });
        }
        
        // Shapes dropdown
        const shapesToggle = document.getElementById('shapes-toggle');
        const shapesGrid = document.getElementById('shapes-grid');
        
        if (shapesToggle && shapesGrid) {
            shapesToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                shapesGrid.classList.toggle('hidden');
                shapesToggle.classList.toggle('active');
            });
            
            document.querySelectorAll('.shape-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const shape = e.currentTarget.dataset.shape;
                    this.setShape(shape);
                    shapesGrid.classList.add('hidden');
                    shapesToggle.classList.remove('active');
                    shapesToggle.innerHTML = `<span>${e.currentTarget.querySelector('.shape-name').textContent}</span><span class="dropdown-arrow">▼</span>`;
                });
            });
        }
        
        // Crop button
        document.getElementById('crop-btn').addEventListener('click', () => {
            this.toggleCropMode();
        });
        
        // Ruler button
        document.getElementById('ruler-btn').addEventListener('click', () => {
            this.toggleRulerMode();
        });
        
        // Action buttons
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearCanvas();
        });
        
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redo();
        });
        
        // File menu handlers
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveCanvas();
        });
        
        document.getElementById('download-btn').addEventListener('click', () => {
            this.downloadCanvas();
        });
        
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareCanvas();
        });
        
        // View menu handlers
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoomIn();
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoomOut();
        });
        
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        document.getElementById('toggle-rulers-btn').addEventListener('click', () => {
            this.toggleRulers();
        });
        
        document.getElementById('toggle-grid-btn').addEventListener('click', () => {
            this.toggleGrid();
        });
        
        document.getElementById('toggle-dotted-btn').addEventListener('click', () => {
            this.toggleDotted();
        });
        
        // Edit menu handlers
        document.getElementById('cut-btn').addEventListener('click', () => {
            this.cutObject();
        });
        
        document.getElementById('copy-btn').addEventListener('click', () => {
            this.copyObject();
        });
        
        document.getElementById('paste-btn').addEventListener('click', () => {
            this.pasteObject();
        });
        
        // Insert menu handlers
        document.getElementById('insert-image-btn').addEventListener('click', () => {
            this.insertImage();
        });
        
        // Layer menu handlers
        document.getElementById('add-layer-btn').addEventListener('click', () => {
            this.addLayer();
        });
        
        document.getElementById('add-layer-btn-sidebar').addEventListener('click', () => {
            this.addLayer();
        });
        
        // Text styling
        document.getElementById('text-size').addEventListener('input', (e) => {
            this.setTextSize(parseInt(e.target.value));
        });
        
        document.getElementById('text-font').addEventListener('change', (e) => {
            this.setTextFont(e.target.value);
        });
        
        // Text input handlers
        document.getElementById('text-confirm').addEventListener('click', () => {
            this.confirmText();
        });
        
        document.getElementById('text-cancel').addEventListener('click', () => {
            this.cancelText();
        });
        
        document.getElementById('text-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.confirmText();
            }
        });
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        // Ctrl/Cmd + Z for undo, Ctrl/Cmd + Y for redo
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            switch(e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 'c':
                    if (this.selectedObject) {
                        this.copyObject();
                    }
                    break;
                case 'v':
                    if (this.copiedObject) {
                        this.pasteObject();
                    }
                    break;
                case 'x':
                    if (this.selectedObject) {
                        this.cutObject();
                    }
                    break;
            }
        }
        
        // Delete key for removing selected object
        if (e.key === 'Delete' && this.selectedObject) {
            this.deleteSelectedObject();
        }
        
        // Escape key to cancel operations
        if (e.key === 'Escape') {
            this.cancelText();
            this.clearSelection();
            this.cropMode = false;
            this.isCropping = false;
            this.rulerMode = false;
            this.isDrawingRuler = false;
            this.redrawCanvas();
        }
    }
    
    /**
     * Handle clicks outside dropdowns to close them
     */
    handleOutsideClick(e) {
        const shapesDropdown = document.getElementById('shapes-grid');
        const shapesToggle = document.getElementById('shapes-toggle');
        const selectDropdown = document.getElementById('select-options');
        const selectToggle = document.getElementById('select-toggle');
        
        if (shapesDropdown && shapesToggle && !shapesToggle.contains(e.target) && !shapesDropdown.contains(e.target)) {
            shapesDropdown.classList.add('hidden');
            shapesToggle.classList.remove('active');
        }
        
        if (selectDropdown && selectToggle && !selectToggle.contains(e.target) && !selectDropdown.contains(e.target)) {
            selectDropdown.classList.add('hidden');
            selectToggle.classList.remove('active');
        }
    }
    
    // ===== DRAWING EVENT HANDLERS =====
    
    handleMouseDown(e) {
        const coords = this.getMouseCoordinates(e);
        
        if (this.cropMode) {
            this.startCrop(coords);
            return;
        }
        
        if (this.rulerMode) {
            this.startRuler(coords);
            return;
        }
        
        if (this.currentTool === 'select') {
            if (this.selectObject(coords.x, coords.y)) {
                this.isMovingObject = true;
                if (this.selectedObject.type === 'text') {
                    this.dragOffset.x = coords.x - this.selectedObject.x;
                    this.dragOffset.y = coords.y - this.selectedObject.y;
                } else if (this.selectedObject.type === 'shape') {
                    this.dragOffset.x = coords.x - this.selectedObject.startX;
                    this.dragOffset.y = coords.y - this.selectedObject.startY;
                } else if (this.selectedObject.type === 'image') {
                    this.dragOffset.x = coords.x - this.selectedObject.x;
                    this.dragOffset.y = coords.y - this.selectedObject.y;
                }
            } else {
                this.startSelection(coords);
            }
            return;
        }
        
        if (this.currentTool === 'text') {
            this.startTextInput(coords);
            return;
        }
        
        if (this.currentTool === 'fill') {
            this.fillArea(coords.x, coords.y, this.currentColor);
            return;
        }
        
        if (this.currentTool === 'picker') {
            this.pickColor(coords.x, coords.y);
            return;
        }
        
        if (this.currentShape) {
            this.startDrawingShape(coords);
            return;
        }
        
        this.startDrawing(coords);
    }
    
    handleMouseMove(e) {
        const coords = this.getMouseCoordinates(e);
        
        // Update coordinates display
        this.updateCoordinatesDisplay(coords.x, coords.y);
        
        if (this.cropMode && this.isCropping) {
            this.updateCrop(coords);
            return;
        }
        
        if (this.rulerMode && this.isDrawingRuler) {
            this.updateRuler(coords);
            return;
        }
        
        if (this.isMovingObject && this.selectedObject) {
            this.moveSelectedObject(coords.x, coords.y);
            return;
        }
        
        if (this.isSelecting) {
            this.updateSelection(coords);
            return;
        }
        
        if (this.isDrawing) {
            if (this.currentShape) {
                this.continueDrawingShape(coords);
            } else {
                this.continueDrawing(coords);
            }
        } else {
            this.updateCursor(coords);
        }
    }
    
    handleMouseUp(e) {
        const coords = this.getMouseCoordinates(e);
        
        if (this.isCropping) {
            this.finalizeCrop();
            return;
        }
        
        if (this.rulerMode && this.isDrawingRuler) {
            this.finalizeRuler();
            return;
        }
        
        if (this.isSelecting) {
            this.finalizeSelection();
            return;
        }
        
        if (this.isMovingObject) {
            this.isMovingObject = false;
            if (window.socketManager && this.selectedObject) {
                // Emit object move to server
                if (this.selectedObject.type === 'shape') {
                    window.socketManager.emitDrawShape(this.selectedObject);
                } else if (this.selectedObject.type === 'text') {
                    window.socketManager.emitAddText(this.selectedObject);
                } else if (this.selectedObject.type === 'image') {
                    window.socketManager.emitAddImage(this.selectedObject);
                }
            }
            return;
        }
        
        // FIXED: Finalize shape drawing when mouse is released
        if (this.isDrawing && this.currentShape && this.tempShape) {
            this.finalizeShapeDrawing(coords);
            return;
        }
        
        this.stopDrawing();
    }
    
    handleMouseOut() {
        this.stopDrawing();
        this.isMovingObject = false;
        this.isSelecting = false;
        this.isCropping = false;
        this.isDrawingRuler = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const coords = this.getTouchCoordinates(touch);
        this.handleMouseDown({ ...e, clientX: touch.clientX, clientY: touch.clientY });
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({ ...e, clientX: touch.clientX, clientY: touch.clientY });
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp(e);
    }
    
    // ===== DRAWING METHODS =====
    
    startDrawing(coords) {
        this.hideWelcomeMessage();
        this.isDrawing = true;
        this.lastX = coords.x;
        this.lastY = coords.y;
        
        // Draw initial point
        this.drawPoint(coords.x, coords.y, this.currentColor, this.brushSize, this.currentTool);
        
        // Create new stroke
        this.currentStroke = {
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            points: [coords],
            color: this.currentColor,
            width: this.brushSize,
            tool: this.currentTool,
            brushType: this.brushType,
            timestamp: Date.now(),
            layerId: this.activeLayer
        };
        
        this.localStrokes.set(this.currentStroke.id, this.currentStroke);
        this.addToHistory();
        
        // Emit to server
        if (window.socketManager) {
            window.socketManager.emitDrawStart({
                ...coords,
                color: this.currentColor,
                width: this.brushSize,
                tool: this.currentTool,
                brushType: this.brushType
            });
        }
    }
    
    continueDrawing(coords) {
        if (!this.isDrawing) return;
        
        // Draw line from last position to current position
        this.drawLine(
            this.lastX, this.lastY,
            coords.x, coords.y,
            this.currentColor,
            this.brushSize,
            this.currentTool
        );
        
        // Add point to current stroke
        if (this.currentStroke) {
            this.currentStroke.points.push(coords);
        }
        
        // Emit to server
        if (window.socketManager) {
            window.socketManager.emitDrawMove(coords);
        }
        
        // Update last position
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Finalize stroke and add to history if it has multiple points
            if (this.currentStroke && this.currentStroke.points.length > 1) {
                this.addToHistory();
            }
            
            this.currentStroke = null;
            
            // Emit draw end to server
            if (window.socketManager) {
                window.socketManager.emitDrawEnd();
            }
        }
    }
    
    startDrawingShape(coords) {
        this.isDrawing = true;
        this.startX = coords.x;
        this.startY = coords.y;
        this.lastX = coords.x;
        this.lastY = coords.y;
        this.tempShape = null;
    }
    
    continueDrawingShape(coords) {
        if (!this.isDrawing) return;
        
        // Clear and redraw canvas to show temporary shape
        this.redrawCanvas();
        
        // Draw temporary shape
        this.drawShape(this.currentShape, this.startX, this.startY, coords.x, coords.y, this.currentColor, this.brushSize, true);
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    // FIXED: Finalize shape drawing and add to objects array
    finalizeShapeDrawing(coords) {
        if (!this.isDrawing || !this.tempShape) return;
        
        // Create permanent shape object
        const shapeObj = {
            id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'shape',
            shape: this.currentShape,
            startX: this.tempShape.startX,
            startY: this.tempShape.startY,
            endX: this.tempShape.endX,
            endY: this.tempShape.endY,
            color: this.tempShape.color,
            width: this.tempShape.width,
            timestamp: Date.now(),
            layerId: this.activeLayer
        };
        
        this.objects.push(shapeObj);
        this.addToHistory();
        
        // Emit to server
        if (window.socketManager) {
            window.socketManager.emitDrawShape(shapeObj);
        }
        
        // Reset temporary shape
        this.tempShape = null;
        this.isDrawing = false;
        
        // Redraw to show permanent shape
        this.redrawCanvas();
    }
    
    // ===== DRAWING PRIMITIVES =====
    
    drawLine(x1, y1, x2, y2, color, width, tool = 'pencil') {
        this.ctx.save();
        
        if (tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(255,255,255,1)';
            this.ctx.lineWidth = width;
            this.ctx.shadowBlur = 0;
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            
            // Apply brush type effects
            switch(this.brushType) {
                case 'calligraphy':
                    this.ctx.lineCap = 'square';
                    this.ctx.lineJoin = 'bevel';
                    break;
                case 'oil':
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.5;
                    break;
                case 'watercolor':
                    this.ctx.globalAlpha = 0.7;
                    break;
                case 'spray':
                    this.ctx.lineWidth = width * 0.6;
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.8;
                    break;
                case 'chalk':
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.2;
                    this.ctx.globalAlpha = 0.9;
                    break;
                default: // round
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.3;
            }
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawPoint(x, y, color, width, tool = 'pencil') {
        this.ctx.save();
        
        if (tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillStyle = 'rgba(255,255,255,1)';
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = color;
            
            // Apply brush type effects
            switch(this.brushType) {
                case 'calligraphy':
                    this.ctx.fillRect(x - width/4, y - width/2, width/2, width);
                    break;
                case 'oil':
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.5;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                case 'watercolor':
                    this.ctx.globalAlpha = 0.7;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                case 'spray':
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.8;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, width / 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                case 'chalk':
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.2;
                    this.ctx.globalAlpha = 0.9;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                default: // round
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = width * 0.3;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
                    this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }
    
    drawShape(shape, startX, startY, endX, endY, color, width, isTemp = false) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.fillStyle = 'transparent';
        
        const widthDiff = endX - startX;
        const heightDiff = endY - startY;
        const centerX = startX + widthDiff / 2;
        const centerY = startY + heightDiff / 2;
        const sizeX = Math.abs(widthDiff) / 2;
        const sizeY = Math.abs(heightDiff) / 2;
        
        this.ctx.beginPath();
        
        switch(shape) {
            case 'rectangle':
                this.ctx.rect(startX, startY, widthDiff, heightDiff);
                break;
            case 'circle':
                const radius = Math.sqrt(sizeX * sizeX + sizeY * sizeY);
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                break;
            case 'line':
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                break;
            case 'triangle':
                this.ctx.moveTo(centerX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.lineTo(startX, endY);
                this.ctx.closePath();
                break;
            case 'star':
                this.drawStarPath(centerX, centerY, 5, sizeX, sizeY * 0.4);
                break;
            case 'arrow':
                this.drawArrowPath(startX, startY, endX, endY, width);
                break;
            case 'ellipse':
                this.ctx.ellipse(centerX, centerY, sizeX, sizeY, 0, 0, Math.PI * 2);
                break;
            case 'polygon':
                this.drawPolygonPath(centerX, centerY, 6, Math.min(sizeX, sizeY));
                break;
            case 'heart':
                this.drawHeartPath(centerX, centerY, Math.min(sizeX, sizeY));
                break;
            case 'diamond':
                this.drawDiamondPath(centerX, centerY, sizeX, sizeY);
                break;
            case 'hexagon':
                this.drawPolygonPath(centerX, centerY, 6, Math.min(sizeX, sizeY));
                break;
            case 'pentagon':
                this.drawPolygonPath(centerX, centerY, 5, Math.min(sizeX, sizeY));
                break;
        }
        
        this.ctx.stroke();
        this.ctx.restore();
        
        if (isTemp) {
            this.tempShape = { shape, startX, startY, endX, endY, color, width };
        }
    }
    
    drawStarPath(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;

        this.ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            let x = cx + Math.cos(rot) * outerRadius;
            let y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }

        this.ctx.closePath();
    }
    
    drawArrowPath(fromX, fromY, toX, toY, lineWidth) {
        const headlen = 15 + lineWidth * 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI/6), toY - headlen * Math.sin(angle - Math.PI/6));
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI/6), toY - headlen * Math.sin(angle + Math.PI/6));
    }
    
    drawPolygonPath(cx, cy, sides, radius) {
        this.ctx.moveTo(cx + radius, cy);
        
        for (let i = 1; i <= sides; i++) {
            const angle = (i * 2 * Math.PI) / sides;
            this.ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        }
        
        this.ctx.closePath();
    }
    
    drawHeartPath(cx, cy, size) {
        this.ctx.moveTo(cx, cy);
        this.ctx.bezierCurveTo(
            cx + size, cy - size * 2,
            cx + size * 2, cy,
            cx, cy + size * 2
        );
        this.ctx.bezierCurveTo(
            cx - size * 2, cy,
            cx - size, cy - size * 2,
            cx, cy
        );
    }
    
    drawDiamondPath(cx, cy, width, height) {
        this.ctx.moveTo(cx, cy - height);
        this.ctx.lineTo(cx + width, cy);
        this.ctx.lineTo(cx, cy + height);
        this.ctx.lineTo(cx - width, cy);
        this.ctx.closePath();
    }
    
    // ===== FLOOD FILL IMPLEMENTATION =====
    
    fillArea(x, y, fillColor) {
        // Create temporary canvas for flood fill
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Copy current canvas state to temporary canvas
        tempCtx.drawImage(this.canvas, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const targetColor = this.getPixelColor(imageData, x, y);
        const fillRgb = this.hexToRgb(fillColor);
        
        // Don't fill if already the same color
        if (this.colorsMatch(targetColor, fillRgb)) {
            return;
        }
        
        // Perform flood fill
        this.floodFill(imageData, x, y, targetColor, fillRgb);
        
        // Apply the filled image data to main canvas
        this.ctx.putImageData(imageData, 0, 0);
        
        this.addToHistory();
        
        // Emit to server
        if (window.socketManager) {
            window.socketManager.emitFillArea({ x, y, color: fillColor });
        }
    }
    
    getPixelColor(imageData, x, y) {
        const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }
    
    colorsMatch(color1, color2) {
        return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    floodFill(imageData, x, y, targetColor, fillColor) {
        const stack = [[x, y]];
        const width = imageData.width;
        const height = imageData.height;
        const visited = new Set();
        
        while (stack.length > 0) {
            const [currentX, currentY] = stack.pop();
            const index = (Math.floor(currentY) * width + Math.floor(currentX)) * 4;
            const key = `${currentX},${currentY}`;
            
            // Check bounds and if already visited
            if (currentX < 0 || currentX >= width || currentY < 0 || currentY >= height || visited.has(key)) {
                continue;
            }
            
            visited.add(key);
            
            const currentColor = {
                r: imageData.data[index],
                g: imageData.data[index + 1],
                b: imageData.data[index + 2],
                a: imageData.data[index + 3]
            };
            
            // Check if this pixel matches the target color
            if (!this.colorsMatch(currentColor, targetColor)) continue;
            
            // Fill the pixel
            imageData.data[index] = fillColor.r;
            imageData.data[index + 1] = fillColor.g;
            imageData.data[index + 2] = fillColor.b;
            imageData.data[index + 3] = 255;
            
            // Add neighboring pixels to stack
            stack.push([currentX + 1, currentY]);
            stack.push([currentX - 1, currentY]);
            stack.push([currentX, currentY + 1]);
            stack.push([currentX, currentY - 1]);
        }
    }
    
    // ===== TEXT TOOL IMPLEMENTATION =====
    
    startTextInput(coords) {
        this.textPosition = coords;
        this.textInputActive = true;
        
        const container = document.getElementById('text-input-container');
        container.classList.remove('hidden');
        container.style.left = coords.x + 'px';
        container.style.top = coords.y + 'px';
        document.getElementById('text-input').focus();
        document.getElementById('text-input').value = '';
        
        // Show text styling options
        document.getElementById('text-styling').classList.remove('hidden');
        
        // Draw selection rectangle
        this.drawTextSelectionRectangle(coords.x, coords.y, 200, 100);
    }
    
    drawTextSelectionRectangle(x, y, width, height) {
        this.selectionCtx.clearRect(0, 0, this.selectionLayer.width, this.selectionLayer.height);
        this.selectionCtx.save();
        this.selectionCtx.strokeStyle = '#4FD1C7';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        this.selectionCtx.strokeRect(x, y, width, height);
        
        // Add resize handles
        this.selectionCtx.fillStyle = '#4FD1C7';
        this.selectionCtx.fillRect(x - 3, y - 3, 6, 6);
        this.selectionCtx.fillRect(x + width - 3, y - 3, 6, 6);
        this.selectionCtx.fillRect(x - 3, y + height - 3, 6, 6);
        this.selectionCtx.fillRect(x + width - 3, y + height - 3, 6, 6);
        
        this.selectionCtx.restore();
    }
    
    confirmText() {
        const text = document.getElementById('text-input').value;
        const fontSize = parseInt(document.getElementById('text-size').value) || 24;
        const fontFamily = document.getElementById('text-font').value || 'Arial';
        
        if (text.trim()) {
            this.addText(this.textPosition.x, this.textPosition.y, text, fontSize, fontFamily, this.currentColor);
        }
        this.cancelText();
    }
    
    cancelText() {
        this.textInputActive = false;
        const container = document.getElementById('text-input-container');
        if (container) {
            container.classList.add('hidden');
        }
        document.getElementById('text-styling').classList.add('hidden');
        this.editingTextElement = null;
        this.selectionCtx.clearRect(0, 0, this.selectionLayer.width, this.selectionLayer.height);
    }
    
    addText(x, y, text, fontSize = 24, fontFamily = 'Arial', color = this.currentColor) {
        const textElement = {
            type: 'text',
            x: x,
            y: y + fontSize, // Adjust for baseline
            text: text,
            fontSize: fontSize,
            fontFamily: fontFamily,
            color: color,
            id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            layerId: this.activeLayer
        };
        
        this.textElements.push(textElement);
        this.drawTextElement(textElement);
        this.addToHistory();
        
        if (window.socketManager) {
            window.socketManager.emitAddText(textElement);
        }
        
        return textElement;
    }
    
    drawTextElement(textElement) {
        this.ctx.save();
        this.ctx.font = `${textElement.fontSize}px ${textElement.fontFamily}`;
        this.ctx.fillStyle = textElement.color;
        this.ctx.fillText(textElement.text, textElement.x, textElement.y);
        this.ctx.restore();
    }
    
    // ===== IMAGE TOOL IMPLEMENTATION =====
    
    insertImage() {
        document.getElementById('image-upload').click();
    }
    
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.addImage(50, 50, img.src, img.width, img.height);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        // Reset file input
        e.target.value = '';
    }
    
    addImage(x, y, src, width, height) {
        const imageElement = {
            type: 'image',
            x: x,
            y: y,
            src: src,
            width: width,
            height: height,
            id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            layerId: this.activeLayer
        };
        
        this.images.push(imageElement);
        this.drawImageElement(imageElement);
        this.addToHistory();
        
        if (window.socketManager) {
            window.socketManager.emitAddImage(imageElement);
        }
        
        return imageElement;
    }
    
    drawImageElement(imageElement) {
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, imageElement.x, imageElement.y, imageElement.width, imageElement.height);
        };
        img.src = imageElement.src;
    }
    
    // ===== SELECTION AND OBJECT MANAGEMENT =====
    
    selectObject(x, y) {
        this.clearSelection();
        
        // Check text elements first (they're on top)
        for (let i = this.textElements.length - 1; i >= 0; i--) {
            const textElement = this.textElements[i];
            if (this.isPointInText(x, y, textElement)) {
                this.selectedObject = textElement;
                this.drawSelectionBox(textElement);
                return true;
            }
        }
        
        // Check images
        for (let i = this.images.length - 1; i >= 0; i--) {
            const imageElement = this.images[i];
            if (this.isPointInImage(x, y, imageElement)) {
                this.selectedObject = imageElement;
                this.drawSelectionBox(imageElement);
                return true;
            }
        }
        
        // Check shapes
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (this.isPointInShape(x, y, obj)) {
                this.selectedObject = obj;
                this.drawSelectionBox(obj);
                return true;
            }
        }
        return false;
    }
    
    isPointInText(x, y, textElement) {
        this.ctx.font = `${textElement.fontSize}px ${textElement.fontFamily}`;
        const metrics = this.ctx.measureText(textElement.text);
        return x >= textElement.x && x <= textElement.x + metrics.width && 
               y >= textElement.y - textElement.fontSize && y <= textElement.y;
    }
    
    isPointInImage(x, y, imageElement) {
        return x >= imageElement.x && x <= imageElement.x + imageElement.width && 
               y >= imageElement.y && y <= imageElement.y + imageElement.height;
    }
    
    isPointInShape(x, y, shape) {
        switch(shape.shape) {
            case 'rectangle':
                const minX = Math.min(shape.startX, shape.endX);
                const maxX = Math.max(shape.startX, shape.endX);
                const minY = Math.min(shape.startY, shape.endY);
                const maxY = Math.max(shape.startY, shape.endY);
                return x >= minX && x <= maxX && y >= minY && y <= maxY;
                
            case 'circle':
                const centerX = (shape.startX + shape.endX) / 2;
                const centerY = (shape.startY + shape.endY) / 2;
                const radius = Math.sqrt(
                    Math.pow(shape.endX - shape.startX, 2) + 
                    Math.pow(shape.endY - shape.startY, 2)
                ) / 2;
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                return distance <= radius;
                
            case 'line':
                // Simple line hit detection
                const lineLength = Math.sqrt(
                    Math.pow(shape.endX - shape.startX, 2) + 
                    Math.pow(shape.endY - shape.startY, 2)
                );
                const distanceToLine = Math.abs(
                    (shape.endY - shape.startY) * x - 
                    (shape.endX - shape.startX) * y + 
                    shape.endX * shape.startY - 
                    shape.endY * shape.startX
                ) / lineLength;
                return distanceToLine <= shape.width + 5;
                
            default:
                return false;
        }
    }
    
    drawSelectionBox(obj) {
        this.objectCtx.clearRect(0, 0, this.objectLayer.width, this.objectLayer.height);
        this.objectCtx.save();
        this.objectCtx.strokeStyle = '#4FD1C7';
        this.objectCtx.lineWidth = 2;
        this.objectCtx.setLineDash([5, 5]);
        
        if (obj.type === 'text') {
            this.ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
            const metrics = this.ctx.measureText(obj.text);
            this.objectCtx.strokeRect(obj.x - 5, obj.y - obj.fontSize - 5, metrics.width + 10, obj.fontSize + 10);
        } else if (obj.type === 'shape') {
            const minX = Math.min(obj.startX, obj.endX);
            const maxX = Math.max(obj.startX, obj.endX);
            const minY = Math.min(obj.startY, obj.endY);
            const maxY = Math.max(obj.startY, obj.endY);
            this.objectCtx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
        } else if (obj.type === 'image') {
            this.objectCtx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
        }
        
        this.objectCtx.restore();
    }
    
    clearSelection() {
        this.selectedObject = null;
        this.objectCtx.clearRect(0, 0, this.objectLayer.width, this.objectLayer.height);
    }
    
    moveSelectedObject(x, y) {
        if (this.selectedObject) {
            if (this.selectedObject.type === 'text') {
                this.selectedObject.x = x - this.dragOffset.x;
                this.selectedObject.y = y - this.dragOffset.y;
            } else if (this.selectedObject.type === 'shape') {
                const dx = x - this.dragOffset.x - this.selectedObject.startX;
                const dy = y - this.dragOffset.y - this.selectedObject.startY;
                this.selectedObject.startX += dx;
                this.selectedObject.startY += dy;
                this.selectedObject.endX += dx;
                this.selectedObject.endY += dy;
            } else if (this.selectedObject.type === 'image') {
                this.selectedObject.x = x - this.dragOffset.x;
                this.selectedObject.y = y - this.dragOffset.y;
            }
            this.redrawCanvas();
            this.drawSelectionBox(this.selectedObject);
        }
    }
    
    // ===== SELECTION TOOLS =====
    
    startSelection(coords) {
        this.isSelecting = true;
        this.selectionStart = { x: coords.x, y: coords.y };
        this.selectionEnd = { x: coords.x, y: coords.y };
        this.drawSelectionArea();
    }
    
    updateSelection(coords) {
        this.selectionEnd = { x: coords.x, y: coords.y };
        this.drawSelectionArea();
    }
    
    finalizeSelection() {
        this.isSelecting = false;
        // Selection area is complete
        // You could implement area-based operations here
    }
    
    drawSelectionArea() {
        this.selectionCtx.clearRect(0, 0, this.selectionLayer.width, this.selectionLayer.height);
        this.selectionCtx.save();
        this.selectionCtx.strokeStyle = '#4FD1C7';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        
        const width = this.selectionEnd.x - this.selectionStart.x;
        const height = this.selectionEnd.y - this.selectionStart.y;
        
        switch(this.selectionType) {
            case 'rectangle':
                this.selectionCtx.strokeRect(this.selectionStart.x, this.selectionStart.y, width, height);
                break;
            case 'circle':
                const centerX = this.selectionStart.x + width / 2;
                const centerY = this.selectionStart.y + height / 2;
                const radius = Math.sqrt(width * width + height * height) / 2;
                this.selectionCtx.beginPath();
                this.selectionCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.selectionCtx.stroke();
                break;
            case 'freeform':
            case 'lasso':
                // For freeform/lasso, we'd need to track multiple points
                // For now, just draw a rectangle
                this.selectionCtx.strokeRect(this.selectionStart.x, this.selectionStart.y, width, height);
                break;
        }
        
        this.selectionCtx.restore();
    }
    
    // ===== CROP TOOL =====
    
    toggleCropMode() {
        this.cropMode = !this.cropMode;
        const cropBtn = document.getElementById('crop-btn');
        if (this.cropMode) {
            cropBtn.classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else {
            cropBtn.classList.remove('active');
            this.updateToolCursor(this.currentTool);
            this.selectionCtx.clearRect(0, 0, this.selectionLayer.width, this.selectionLayer.height);
        }
    }
    
    startCrop(coords) {
        this.isCropping = true;
        this.cropStartX = coords.x;
        this.cropStartY = coords.y;
        this.cropEndX = coords.x;
        this.cropEndY = coords.y;
        this.drawCropArea();
    }
    
    updateCrop(coords) {
        this.cropEndX = coords.x;
        this.cropEndY = coords.y;
        this.drawCropArea();
    }
    
    finalizeCrop() {
        this.isCropping = false;
        this.cropMode = false;
        
        const x = Math.min(this.cropStartX, this.cropEndX);
        const y = Math.min(this.cropStartY, this.cropEndY);
        const width = Math.abs(this.cropEndX - this.cropStartX);
        const height = Math.abs(this.cropEndY - this.cropStartY);
        
        if (width > 10 && height > 10) {
            // Get the selected area
            const imageData = this.ctx.getImageData(x, y, width, height);
            
            // Clear the entire canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Put the cropped area at the top-left
            this.ctx.putImageData(imageData, 0, 0);
            
            this.addToHistory();
            
            // Clear all strokes and objects since we've modified the canvas
            this.localStrokes.clear();
            this.remoteStrokes.clear();
            this.objects = [];
            this.textElements = [];
            this.images = [];
            this.clearSelection();
        }
        
        this.selectionCtx.clearRect(0, 0, this.selectionLayer.width, this.selectionLayer.height);
    }
    
    drawCropArea() {
        this.selectionCtx.clearRect(0, 0, this.selectionLayer.width, this.selectionLayer.height);
        this.selectionCtx.save();
        this.selectionCtx.strokeStyle = '#FF6B6B';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        
        const width = this.cropEndX - this.cropStartX;
        const height = this.cropEndY - this.cropStartY;
        
        this.selectionCtx.strokeRect(this.cropStartX, this.cropStartY, width, height);
        
        this.selectionCtx.restore();
    }
    
    // ===== RULER TOOL =====
    
    toggleRulerMode() {
        this.rulerMode = !this.rulerMode;
        const rulerBtn = document.getElementById('ruler-btn');
        if (this.rulerMode) {
            rulerBtn.classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else {
            rulerBtn.classList.remove('active');
            this.updateToolCursor(this.currentTool);
            this.rulerCtx.clearRect(0, 0, this.rulerLayer.width, this.rulerLayer.height);
        }
    }
    
    toggleRulers() {
        this.showRulers = !this.showRulers;
        const horizontalRuler = document.getElementById('horizontal-ruler');
        const verticalRuler = document.getElementById('vertical-ruler');
        
        if (this.showRulers) {
            horizontalRuler.classList.remove('hidden');
            verticalRuler.classList.remove('hidden');
            this.updateRulers();
        } else {
            horizontalRuler.classList.add('hidden');
            verticalRuler.classList.add('hidden');
        }
    }
    
    toggleGrid() {
        this.showGrid = !this.showGrid;
        const gridBackground = document.getElementById('grid-background');
        
        if (this.showGrid) {
            gridBackground.classList.remove('hidden');
        } else {
            gridBackground.classList.add('hidden');
        }
    }
    
    toggleDotted() {
        this.showDotted = !this.showDotted;
        const dottedBackground = document.getElementById('dotted-background');
        
        if (this.showDotted) {
            dottedBackground.classList.remove('hidden');
        } else {
            dottedBackground.classList.add('hidden');
        }
    }
    
    initializeRulers() {
        this.updateRulers();
    }
    
    updateRulers() {
        if (!this.showRulers) return;
        
        const horizontalRuler = document.getElementById('horizontal-ruler');
        const verticalRuler = document.getElementById('vertical-ruler');
        
        // Clear rulers
        horizontalRuler.innerHTML = '';
        verticalRuler.innerHTML = '';
        
        // Add marks to horizontal ruler
        for (let i = 0; i <= this.canvas.width; i += 50) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark';
            mark.style.left = i + 'px';
            horizontalRuler.appendChild(mark);
            
            if (i % 100 === 0) {
                const label = document.createElement('div');
                label.className = 'ruler-label';
                label.textContent = i;
                label.style.left = (i - 10) + 'px';
                label.style.top = '20px';
                horizontalRuler.appendChild(label);
            }
        }
        
        // Add marks to vertical ruler
        for (let i = 0; i <= this.canvas.height; i += 50) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark';
            mark.style.top = i + 'px';
            verticalRuler.appendChild(mark);
            
            if (i % 100 === 0) {
                const label = document.createElement('div');
                label.className = 'ruler-label';
                label.textContent = i;
                label.style.top = (i - 6) + 'px';
                label.style.left = '20px';
                verticalRuler.appendChild(label);
            }
        }
    }
    
    startRuler(coords) {
        this.isDrawingRuler = true;
        this.rulerStart = { x: coords.x, y: coords.y };
        this.rulerEnd = { x: coords.x, y: coords.y };
        this.drawRulerLine(this.rulerStart.x, this.rulerStart.y, this.rulerEnd.x, this.rulerEnd.y);
    }
    
    updateRuler(coords) {
        if (!this.isDrawingRuler) return;
        this.rulerCtx.clearRect(0, 0, this.rulerLayer.width, this.rulerLayer.height);
        this.drawRulerLine(this.rulerStart.x, this.rulerStart.y, coords.x, coords.y);
    }
    
    finalizeRuler() {
        this.isDrawingRuler = false;
        // Ruler line stays visible until ruler mode is toggled off
    }
    
    drawRulerLine(x1, y1, x2, y2) {
        this.rulerCtx.save();
        this.rulerCtx.strokeStyle = '#FF6B6B';
        this.rulerCtx.lineWidth = 2;
        this.rulerCtx.setLineDash([5, 5]);
        this.rulerCtx.beginPath();
        this.rulerCtx.moveTo(x1, y1);
        this.rulerCtx.lineTo(x2, y2);
        this.rulerCtx.stroke();
        
        // Draw distance text
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        this.rulerCtx.fillStyle = '#FF6B6B';
        this.rulerCtx.font = '12px Arial';
        this.rulerCtx.fillText(`${Math.round(distance)}px`, (x1 + x2) / 2, (y1 + y2) / 2 - 10);
        
        this.rulerCtx.restore();
    }
    
    // ===== TOOL MANAGEMENT =====
    
    setTool(tool) {
        this.currentTool = tool;
        this.currentShape = null;
        this.cropMode = false;
        this.rulerMode = false;
        this.clearSelection();
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        this.updateToolCursor(tool);
        
        // Show/hide text styling
        if (tool === 'text') {
            document.getElementById('text-styling').classList.remove('hidden');
        } else {
            document.getElementById('text-styling').classList.add('hidden');
        }
    }
    
    updateToolCursor(tool) {
        switch(tool) {
            case 'eraser':
                this.updateEraserCursor();
                break;
            case 'picker':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            case 'crop':
            case 'ruler':
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }
    
    updateEraserCursor() {
        const size = Math.max(10, this.brushSize * 2);
        this.canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" stroke="black" stroke-width="2"/></svg>') ${size/2} ${size/2}, auto`;
    }
    
    setBrushType(type) {
        this.brushType = type;
    }
    
    setShape(shape) {
        this.currentShape = shape;
        this.currentTool = 'shape';
        this.clearSelection();
        
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-shape="${shape}"]`).classList.add('active');
        
        this.canvas.style.cursor = 'crosshair';
    }
    
    setSelectionType(type) {
        this.selectionType = type;
        this.setTool('select');
    }
    
    setColor(color) {
        this.currentColor = color;
        this.addToRecentColors(color);
        this.updateBrushPreview();
    }
    
    setBrushSize(size) {
        this.brushSize = size;
        document.getElementById('brush-size-value').textContent = `${size}px`;
        this.updateBrushPreview();
        this.updateEraserCursor();
    }
    
    setTextSize(size) {
        // Update text size for current text input
        if (this.textInputActive) {
            // Could update preview here
        }
    }
    
    setTextFont(font) {
        // Update text font for current text input
        if (this.textInputActive) {
            // Could update preview here
        }
    }
    
    updateBrushPreview() {
        const preview = document.getElementById('brush-preview');
        if (preview) {
            const displaySize = Math.max(10, this.brushSize * 0.6);
            preview.style.width = `${displaySize}px`;
            preview.style.height = `${displaySize}px`;
            preview.style.backgroundColor = this.currentColor;
        }
    }
    
    updateCoordinatesDisplay(x, y) {
        const coordinatesElement = document.getElementById('coordinates');
        if (coordinatesElement) {
            coordinatesElement.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        }
    }
    
    // ===== RECENT COLORS MANAGEMENT =====
    
    initializeRecentColors() {
        const defaultColors = [
            '#ff4757', '#2ed573', '#1e90ff', '#ffa502',
            '#a55eea', '#000000', '#ffffff', '#bdc3c7'
        ];
        this.recentColors = [...defaultColors];
        this.updateRecentColorsDisplay();
    }
    
    addToRecentColors(color) {
        // Remove if already exists
        this.recentColors = this.recentColors.filter(c => c !== color);
        // Add to beginning
        this.recentColors.unshift(color);
        // Limit to max size
        if (this.recentColors.length > this.maxRecentColors) {
            this.recentColors.pop();
        }
        this.updateRecentColorsDisplay();
    }
    
    updateRecentColorsDisplay() {
        const container = document.getElementById('recent-colors');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.recentColors.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'recent-color';
            colorElement.style.backgroundColor = color;
            colorElement.title = color;
            colorElement.addEventListener('click', () => {
                this.setColor(color);
                document.getElementById('color-picker').value = color;
            });
            container.appendChild(colorElement);
        });
    }
    
    pickColor(x, y) {
        const imageData = this.ctx.getImageData(x, y, 1, 1).data;
        const color = `#${((1 << 24) + (imageData[0] << 16) + (imageData[1] << 8) + imageData[2]).toString(16).slice(1)}`;
        this.setColor(color);
        document.getElementById('color-picker').value = color;
    }
    
    // ===== COORDINATE METHODS =====
    
    getMouseCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
            width: this.brushSize,
            tool: this.currentTool
        };
    }
    
    getTouchCoordinates(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
            width: this.brushSize,
            tool: this.currentTool
        };
    }
    
    updateCursor(coords) {
        // Update local cursor display
        this.drawLocalCursor(coords);
        
        // Emit cursor position to server
        if (window.socketManager) {
            window.socketManager.emitCursorMove(coords);
        }
    }
    
    drawLocalCursor(coords) {
        this.cursorCtx.clearRect(0, 0, this.cursorLayer.width, this.cursorLayer.height);
        
        this.cursorCtx.save();
        this.cursorCtx.strokeStyle = this.currentColor;
        this.cursorCtx.lineWidth = 2;
        this.cursorCtx.setLineDash([5, 5]);
        
        // Draw crosshair
        const size = 20;
        this.cursorCtx.beginPath();
        this.cursorCtx.moveTo(coords.x - size, coords.y);
        this.cursorCtx.lineTo(coords.x + size, coords.y);
        this.cursorCtx.moveTo(coords.x, coords.y - size);
        this.cursorCtx.lineTo(coords.x, coords.y + size);
        this.cursorCtx.stroke();
        
        this.cursorCtx.restore();
    }
    
    // ===== HISTORY MANAGEMENT =====
    
    initializeHistory() {
        this.addToHistory();
    }
    
    addToHistory() {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.strokeHistory.length - 1) {
            this.strokeHistory = this.strokeHistory.slice(0, this.historyIndex + 1);
        }
        
        // Take snapshot of current canvas
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.strokeHistory.push(imageData);
        this.historyIndex++;
        
        // Limit history size
        if (this.strokeHistory.length > this.maxHistorySize) {
            this.strokeHistory.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const imageData = this.strokeHistory[this.historyIndex];
            this.ctx.putImageData(imageData, 0, 0);
            this.updateUndoRedoButtons();
            
            // Emit undo to server
            if (window.socketManager) {
                window.socketManager.emitUndo();
            }
        }
    }
    
    redo() {
        if (this.historyIndex < this.strokeHistory.length - 1) {
            this.historyIndex++;
            const imageData = this.strokeHistory[this.historyIndex];
            this.ctx.putImageData(imageData, 0, 0);
            this.updateUndoRedoButtons();
            
            // Emit redo to server
            if (window.socketManager) {
                window.socketManager.emitRedo();
            }
        }
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.strokeHistory.length - 1;
    }
    
    // ===== LAYER MANAGEMENT =====
    
    initializeLayers() {
        this.updateLayersList();
    }
    
    addLayer() {
        const newLayer = {
            id: `layer-${Date.now()}`,
            name: `Layer ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 1,
            order: this.layers.length
        };
        
        this.layers.push(newLayer);
        this.setActiveLayer(newLayer.id);
        this.updateLayersList();
        
        // Emit to server
        if (window.socketManager) {
            window.socketManager.emitAddLayer(newLayer);
        }
    }
    
    setActiveLayer(layerId) {
        this.activeLayer = layerId;
        this.updateLayersList();
        
        // Emit to server
        if (window.socketManager) {
            window.socketManager.emitSetActiveLayer(layerId);
        }
    }
    
    updateLayersList() {
        const layersList = document.getElementById('layers-list');
        if (!layersList) return;
        
        layersList.innerHTML = '';
        
        // Sort layers by order (reverse for display)
        const sortedLayers = [...this.layers].sort((a, b) => b.order - a.order);
        
        sortedLayers.forEach(layer => {
            const layerElement = document.createElement('div');
            layerElement.className = `layer-item ${layer.id === this.activeLayer ? 'active' : ''}`;
            layerElement.innerHTML = `
                <div class="layer-visibility">
                    <i class="fas fa-${layer.visible ? 'eye' : 'eye-slash'}"></i>
                </div>
                <span class="layer-name">${layer.name}</span>
                <div class="layer-actions">
                    <button class="layer-action-btn" data-action="delete" title="Delete Layer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Toggle visibility
            layerElement.querySelector('.layer-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                this.updateLayersList();
                this.redrawCanvas();
            });
            
            // Set active layer
            layerElement.addEventListener('click', () => {
                this.setActiveLayer(layer.id);
            });
            
            // Delete layer
            layerElement.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.layers.length > 1) {
                    this.layers = this.layers.filter(l => l.id !== layer.id);
                    if (this.activeLayer === layer.id) {
                        this.setActiveLayer(this.layers[0].id);
                    }
                    this.updateLayersList();
                    this.redrawCanvas();
                }
            });
            
            layersList.appendChild(layerElement);
        });
    }
    
    handleLayerAdded(layer) {
        this.layers.push(layer);
        this.updateLayersList();
    }
    
    handleActiveLayerChanged(layerId) {
        this.activeLayer = layerId;
        this.updateLayersList();
    }
    
    // ===== FILE OPERATIONS =====
    
    saveCanvas() {
        // Create a temporary canvas to combine everything
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Draw white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the main canvas content (includes all drawings)
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'collaborative-canvas.png';
        link.href = tempCanvas.toDataURL();
        link.click();
    }
    
    downloadCanvas() {
        this.saveCanvas(); // Same functionality for now
    }
    
    shareCanvas() {
        if (navigator.share) {
            this.canvas.toBlob(blob => {
                const file = new File([blob], 'collaborative-canvas.png', { type: 'image/png' });
                navigator.share({
                    files: [file],
                    title: 'Collaborative Canvas Art',
                    text: 'Check out this collaborative artwork created with Collaborative Canvas Pro!'
                });
            });
        } else {
            // Fallback: copy data URL to clipboard
            const dataUrl = this.canvas.toDataURL();
            navigator.clipboard.writeText(dataUrl).then(() => {
                alert('Canvas image copied to clipboard! You can now paste it anywhere.');
            }).catch(() => {
                alert('Sharing not supported in this browser. Please use the download option.');
            });
        }
    }
    
    // ===== VIEW CONTROLS =====
    
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
        this.updateZoom();
    }
    
    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.1);
        this.updateZoom();
    }
    
    updateZoom() {
        const container = document.getElementById('canvas-container');
        if (container) {
            container.style.transform = `scale(${this.zoomLevel})`;
            const zoomLevelElement = document.getElementById('zoom-level');
            if (zoomLevelElement) {
                zoomLevelElement.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            }
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // ===== OBJECT OPERATIONS =====
    
    copyObject() {
        if (this.selectedObject) {
            this.copiedObject = JSON.parse(JSON.stringify(this.selectedObject));
            this.copiedObject.id = `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Offset the copy position
            this.copiedObject.x += 20;
            this.copiedObject.y += 20;
            if (this.copiedObject.startX) {
                this.copiedObject.startX += 20;
                this.copiedObject.endX += 20;
                this.copiedObject.startY += 20;
                this.copiedObject.endY += 20;
            }
        }
    }
    
    pasteObject() {
        if (this.copiedObject) {
            if (this.copiedObject.type === 'text') {
                this.textElements.push(this.copiedObject);
            } else if (this.copiedObject.type === 'shape') {
                this.objects.push(this.copiedObject);
            } else if (this.copiedObject.type === 'image') {
                this.images.push(this.copiedObject);
            }
            this.redrawCanvas();
            this.selectedObject = this.copiedObject;
            this.drawSelectionBox(this.selectedObject);
        }
    }
    
    cutObject() {
        if (this.selectedObject) {
            this.copyObject();
            this.deleteSelectedObject();
        }
    }
    
    deleteSelectedObject() {
        if (this.selectedObject) {
            if (this.selectedObject.type === 'text') {
                this.textElements = this.textElements.filter(obj => obj.id !== this.selectedObject.id);
            } else if (this.selectedObject.type === 'shape') {
                this.objects = this.objects.filter(obj => obj.id !== this.selectedObject.id);
            } else if (this.selectedObject.type === 'image') {
                this.images = this.images.filter(obj => obj.id !== this.selectedObject.id);
            }
            this.clearSelection();
            this.redrawCanvas();
            this.addToHistory();
        }
    }
    
    // ===== CANVAS MANAGEMENT =====
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Set canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;
        this.cursorLayer.width = width;
        this.cursorLayer.height = height;
        this.selectionLayer.width = width;
        this.selectionLayer.height = height;
        this.objectLayer.width = width;
        this.objectLayer.height = height;
        this.rulerLayer.width = width;
        this.rulerLayer.height = height;
        
        // Update rulers
        this.updateRulers();
        
        // Redraw everything
        this.redrawAllStrokes();
    }
    
    clearCanvas() {
        if (confirm('Are you sure you want to clear the entire canvas? This will clear for all users.')) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.localStrokes.clear();
            this.remoteStrokes.clear();
            this.objects = [];
            this.textElements = [];
            this.images = [];
            this.clearSelection();
            this.addToHistory();
            
            // Emit clear to server
            if (window.socketManager) {
                window.socketManager.emitClearCanvas();
            }
        }
    }
    
    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.redrawAllStrokes();
    }
    
    redrawAllStrokes() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all local strokes
        this.localStrokes.forEach(stroke => {
            if (stroke.points && stroke.points.length > 0 && this.isLayerVisible(stroke.layerId)) {
                // Draw first point
                this.drawPoint(
                    stroke.points[0].x, stroke.points[0].y,
                    stroke.color, stroke.width, stroke.tool
                );
                
                // Draw lines between points
                for (let i = 1; i < stroke.points.length; i++) {
                    this.drawLine(
                        stroke.points[i-1].x, stroke.points[i-1].y,
                        stroke.points[i].x, stroke.points[i].y,
                        stroke.color, stroke.width, stroke.tool
                    );
                }
            }
        });
        
        // Redraw all remote strokes
        this.remoteStrokes.forEach(stroke => {
            if (stroke.points && stroke.points.length > 0 && this.isLayerVisible(stroke.layerId)) {
                // Draw first point
                this.drawPoint(
                    stroke.points[0].x, stroke.points[0].y,
                    stroke.color, stroke.width, stroke.tool
                );
                
                // Draw lines between points
                for (let i = 1; i < stroke.points.length; i++) {
                    this.drawLine(
                        stroke.points[i-1].x, stroke.points[i-1].y,
                        stroke.points[i].x, stroke.points[i].y,
                        stroke.color, stroke.width, stroke.tool
                    );
                }
            }
        });
        
        // Redraw all objects
        this.objects.forEach(obj => {
            if (obj.type === 'shape' && this.isLayerVisible(obj.layerId)) {
                this.drawShape(obj.shape, obj.startX, obj.startY, obj.endX, obj.endY, obj.color, obj.width);
            }
        });
        
        // Redraw all text elements
        this.textElements.forEach(textElement => {
            if (this.isLayerVisible(textElement.layerId)) {
                this.drawTextElement(textElement);
            }
        });
        
        // Redraw all images
        this.images.forEach(imageElement => {
            if (this.isLayerVisible(imageElement.layerId)) {
                this.drawImageElement(imageElement);
            }
        });
        
        // Redraw temporary shape if exists
        if (this.tempShape) {
            this.drawShape(
                this.tempShape.shape,
                this.tempShape.startX,
                this.tempShape.startY,
                this.tempShape.endX,
                this.tempShape.endY,
                this.tempShape.color,
                this.tempShape.width,
                true
            );
        }
        
        // Redraw selection if exists
        if (this.selectedObject) {
            this.drawSelectionBox(this.selectedObject);
        }
    }
    
    isLayerVisible(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        return layer ? layer.visible : true;
    }
    
    // ===== REMOTE DRAWING HANDLERS =====
    
    handleRemoteDrawStart(stroke) {
        this.hideWelcomeMessage();
        this.remoteStrokes.set(stroke.id, stroke);
        
        // Draw the initial point
        const startPoint = stroke.points[0];
        this.drawPoint(
            startPoint.x, startPoint.y,
            stroke.color, stroke.width, stroke.tool
        );
    }
    
    handleRemoteDrawMove(data) {
        const stroke = this.remoteStrokes.get(data.strokeId);
        if (stroke && stroke.points.length > 0) {
            const lastPoint = stroke.points[stroke.points.length - 1];
            const currentPoint = data.point;
            
            // Draw line from last point to current point
            this.drawLine(
                lastPoint.x, lastPoint.y,
                currentPoint.x, currentPoint.y,
                stroke.color, stroke.width, stroke.tool
            );
            
            // Add point to stroke
            stroke.points.push(currentPoint);
        }
    }
    
    handleRemoteDrawEnd(strokeId) {
        // Stroke is complete, no additional action needed
    }
    
    handleRemoteDrawShape(shapeData) {
        this.objects.push(shapeData);
        this.redrawCanvas();
    }
    
    handleRemoteFillArea(fillData) {
        this.fillArea(fillData.x, fillData.y, fillData.color);
    }
    
    handleRemoteAddText(textData) {
        this.textElements.push(textData);
        this.redrawCanvas();
    }
    
    handleRemoteAddImage(imageData) {
        this.images.push(imageData);
        this.redrawCanvas();
    }
    
    handleRemoteCursorMove(userId, cursor, color, name) {
        this.remoteCursors.set(userId, { cursor, color, name });
        this.drawRemoteCursors();
    }
    
    drawRemoteCursors() {
        this.cursorCtx.clearRect(0, 0, this.cursorLayer.width, this.cursorLayer.height);
        
        // Draw local cursor first
        if (!this.isDrawing) {
            // Local cursor is drawn separately in updateCursor
        }
        
        // Draw remote cursors
        this.remoteCursors.forEach((data, userId) => {
            if (!data.cursor) return;
            
            const { x, y } = data.cursor;
            
            this.cursorCtx.save();
            
            // Draw cursor circle
            this.cursorCtx.fillStyle = data.color;
            this.cursorCtx.beginPath();
            this.cursorCtx.arc(x, y, 8, 0, Math.PI * 2);
            this.cursorCtx.fill();
            
            // Draw cursor border
            this.cursorCtx.strokeStyle = '#ffffff';
            this.cursorCtx.lineWidth = 2;
            this.cursorCtx.stroke();
            
            // Draw user name label
            this.cursorCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.cursorCtx.fillRect(x + 10, y - 25, 80, 20);
            
            this.cursorCtx.fillStyle = '#ffffff';
            this.cursorCtx.font = '12px Arial';
            this.cursorCtx.fillText(data.name || `User ${userId.slice(-4)}`, x + 15, y - 10);
            
            this.cursorCtx.restore();
        });
    }
    
    handleCanvasCleared() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.localStrokes.clear();
        this.remoteStrokes.clear();
        this.objects = [];
        this.textElements = [];
        this.images = [];
        this.clearSelection();
        this.addToHistory();
    }
    
    handleUserLeft(userId) {
        this.remoteCursors.delete(userId);
        this.drawRemoteCursors();
    }
    
    handleInitialState(roomState) {
        if (roomState && roomState.strokes) {
            roomState.strokes.forEach(stroke => {
                if (stroke.type === 'stroke') {
                    this.remoteStrokes.set(stroke.id, stroke);
                } else if (stroke.type === 'shape') {
                    this.objects.push(stroke);
                } else if (stroke.type === 'text') {
                    this.textElements.push(stroke);
                } else if (stroke.type === 'image') {
                    this.images.push(stroke);
                }
            });
            
            // Initialize layers from server
            if (roomState.layers) {
                this.layers = roomState.layers;
                this.activeLayer = roomState.activeLayer;
                this.updateLayersList();
            }
            
            this.redrawAllStrokes();
        }
    }
    
    handleRemoteUndo(strokeId) {
        this.undo();
    }
    
    handleRemoteRedo(stroke) {
        this.redo();
    }
    
    // ===== UTILITY METHODS =====
    
    hideWelcomeMessage() {
        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) {
            welcomeMsg.classList.add('hidden');
        }
    }
    
    // ===== PERFORMANCE MONITORING =====
    
    startFpsCounter() {
        const updateFps = () => {
            this.frameCount++;
            const now = performance.now();
            
            if (now >= this.lastFpsUpdate + 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
                this.frameCount = 0;
                this.lastFpsUpdate = now;
                
                const fpsCounter = document.getElementById('fps-counter');
                if (fpsCounter) {
                    fpsCounter.textContent = `${this.fps} FPS`;
                    // Color code based on performance
                    fpsCounter.style.color = this.fps > 30 ? '#2ecc71' : this.fps > 15 ? '#f39c12' : '#e74c3c';
                }
            }
            
            requestAnimationFrame(updateFps);
        };
        
        updateFps();
    }
}