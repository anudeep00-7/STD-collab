import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useWebRTC from '../hooks/useWebRTC';
import socket from '../socket/socket';
import Whiteboard from '../components/Whiteboard';
import FilePanel from '../components/FilePanel';

/**
 * Room Page — Main Collaboration Space
 */
const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [participants, setParticipants] = useState([]);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showFiles, setShowFiles] = useState(false);

    const {
        localStream,
        remoteStreams,
        isAudioMuted,
        isVideoOff,
        toggleAudio,
        toggleVideo,
    } = useWebRTC(roomId);

    const localVideoRef = useRef(null);

    // Set local video stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Socket connection and room events
    useEffect(() => {
        if (!user || !roomId) return;

        socket.connect();

        socket.emit('join-room', {
            roomId,
            userId: user._id,
            userName: user.name,
        });

        const handleParticipants = (participantsList) => {
            setParticipants(participantsList);
        };

        const handleUserJoined = (newUser) => {
            setParticipants((prev) => [...prev, newUser]);
        };

        const handleUserLeft = (leftUser) => {
            setParticipants((prev) =>
                prev.filter((p) => p.socketId !== leftUser.socketId)
            );
        };

        socket.on('room-participants', handleParticipants);
        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);

        return () => {
            socket.emit('leave-room', { roomId });
            socket.off('room-participants', handleParticipants);
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
            socket.disconnect();
        };
    }, [roomId, user]);

    /**
     * Leave room — explicitly stop all media tracks before navigating away.
     * This ensures the camera/mic LEDs turn off immediately.
     */
    const handleLeaveRoom = () => {
        // Stop local camera/mic tracks immediately
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }
        // Also clean up any srcObject references
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        navigate('/dashboard');
    };

    // Calculate grid columns
    const totalStreams = 1 + Object.keys(remoteStreams).length;
    const getGridCols = () => {
        if (totalStreams <= 1) return 'grid-cols-1';
        if (totalStreams <= 2) return 'grid-cols-1 md:grid-cols-2';
        if (totalStreams <= 4) return 'grid-cols-2';
        if (totalStreams <= 6) return 'grid-cols-2 md:grid-cols-3';
        return 'grid-cols-3 md:grid-cols-4';
    };

    return (
        <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
            {/* Room Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-white">
                        STD<span className="text-blue-500">collab</span>
                    </h1>
                    <span className="text-slate-400 text-sm">
                        Room: <span className="text-white font-mono">{roomId}</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">
                        {participants.length} participant{participants.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={handleLeaveRoom}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition cursor-pointer"
                    >
                        Leave
                    </button>
                </div>
            </header>

            {/* Video Grid */}
            <main className={`flex-1 p-4 overflow-auto transition-all ${showFiles ? 'mr-80' : ''}`}>
                <div className={`grid ${getGridCols()} gap-4 h-full auto-rows-fr`}>
                    {/* Local Video */}
                    <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 min-h-[200px]">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {isVideoOff && (
                            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-lg text-white text-sm">
                            You {isAudioMuted && '🔇'} {isVideoOff && '📷'}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {Object.entries(remoteStreams).map(([socketId, { stream, userName }]) => (
                        <RemoteVideo key={socketId} stream={stream} userName={userName} />
                    ))}
                </div>
            </main>

            {/* Bottom Controls Bar */}
            <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-center gap-4 shrink-0">
                <button
                    onClick={toggleAudio}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${isAudioMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    title={isAudioMuted ? 'Unmute' : 'Mute'}
                >
                    <span className="text-white text-lg">{isAudioMuted ? '🔇' : '🎤'}</span>
                </button>

                <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                    <span className="text-white text-lg">{isVideoOff ? '📷' : '🎥'}</span>
                </button>

                <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${showWhiteboard ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    title="Toggle whiteboard"
                >
                    <span className="text-white text-lg">✏️</span>
                </button>

                <button
                    onClick={() => setShowFiles(!showFiles)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${showFiles ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    title="Toggle files"
                >
                    <span className="text-white text-lg">📁</span>
                </button>

                <button
                    onClick={handleLeaveRoom}
                    className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition cursor-pointer"
                    title="Leave room"
                >
                    <span className="text-white text-lg">📞</span>
                </button>
            </div>

            {/* Whiteboard Overlay — onClose closes it */}
            <Whiteboard
                roomId={roomId}
                isVisible={showWhiteboard}
                onClose={() => setShowWhiteboard(false)}
            />

            {/* File Panel Sidebar */}
            <FilePanel roomId={roomId} isVisible={showFiles} />
        </div>
    );
};

/**
 * RemoteVideo Component
 */
const RemoteVideo = ({ stream, userName }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 min-h-[200px]">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-lg text-white text-sm">
                {userName}
            </div>
        </div>
    );
};

export default Room;
