import { useRef, useEffect, useState, useCallback } from 'react';
import socket from '../socket/socket';

/**
 * Whiteboard Component
 * 
 * Collaborative drawing canvas synced via Socket.IO.
 * - Mouse drawing with configurable color and line width
 * - Real-time broadcast to other participants
 * - Strokes persisted in MongoDB and reloaded on join
 * - Clear whiteboard action
 * - Close button to return to video view
 */
const Whiteboard = ({ roomId, isVisible, onClose }) => {
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPosition = useRef({ x: 0, y: 0 });

    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(3);

    const colors = ['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];

    /**
     * Get mouse position relative to canvas
     */
    const getCanvasPosition = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    }, []);

    /**
     * Draw a line segment on the canvas
     */
    const drawLine = useCallback((x0, y0, x1, y1, strokeColor, strokeWidth) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, []);

    const handleMouseDown = useCallback((e) => {
        isDrawing.current = true;
        const pos = getCanvasPosition(e);
        lastPosition.current = pos;
    }, [getCanvasPosition]);

    const handleMouseMove = useCallback((e) => {
        if (!isDrawing.current) return;

        const pos = getCanvasPosition(e);
        const { x: x0, y: y0 } = lastPosition.current;
        const { x: x1, y: y1 } = pos;

        drawLine(x0, y0, x1, y1, color, lineWidth);

        socket.emit('draw', {
            roomId,
            stroke: { x0, y0, x1, y1, color, lineWidth },
        });

        lastPosition.current = pos;
    }, [color, lineWidth, roomId, getCanvasPosition, drawLine]);

    const handleMouseUp = useCallback(() => {
        isDrawing.current = false;
    }, []);

    const handleClear = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('clear-whiteboard', { roomId });
    }, [roomId]);

    /**
     * Set up socket listeners and load existing whiteboard data.
     * FIX: Register listener BEFORE emitting load request,
     *      so the response isn't missed.
     */
    useEffect(() => {
        if (!roomId || !isVisible) return;

        // Receive stored strokes
        const handleLoad = (strokes) => {
            strokes.forEach((s) => {
                drawLine(s.x0, s.y0, s.x1, s.y1, s.color, s.lineWidth);
            });
        };

        // Receive real-time drawing from other users
        const handleDraw = (stroke) => {
            drawLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.lineWidth);
        };

        // Handle clear
        const handleClearEvent = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        // Register listeners FIRST
        socket.on('load-whiteboard', handleLoad);
        socket.on('draw', handleDraw);
        socket.on('clear-whiteboard', handleClearEvent);

        // THEN request stored data
        socket.emit('load-whiteboard', { roomId });

        return () => {
            socket.off('load-whiteboard', handleLoad);
            socket.off('draw', handleDraw);
            socket.off('clear-whiteboard', handleClearEvent);
        };
    }, [roomId, isVisible, drawLine]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-[90vw] max-w-5xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <h3 className="text-white font-semibold text-sm">Whiteboard</h3>

                        {/* Color Picker */}
                        <div className="flex gap-1.5 ml-4">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 rounded-full transition cursor-pointer ${color === c ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        {/* Line Width */}
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-slate-400 text-xs">Size:</span>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={lineWidth}
                                onChange={(e) => setLineWidth(Number(e.target.value))}
                                className="w-20 accent-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClear}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition cursor-pointer"
                        >
                            Clear
                        </button>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs transition cursor-pointer"
                        >
                            ✕ Close
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    width={1280}
                    height={720}
                    className="w-full bg-slate-950 cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
