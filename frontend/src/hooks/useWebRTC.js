import { useRef, useEffect, useState, useCallback } from 'react';
import socket from '../socket/socket';

/**
 * useWebRTC Hook
 * 
 * Manages peer-to-peer WebRTC connections in a mesh architecture.
 * Each participant creates a direct RTCPeerConnection to every other participant.
 * 
 * Flow:
 * 1. User joins room → receives list of existing participants
 * 2. For each existing participant, create an RTCPeerConnection and send offer
 * 3. When a new user joins, they receive offers from existing participants
 * 4. Exchange ICE candidates & answers to establish connections
 * 5. Remote streams are tracked and returned for video rendering
 * 
 * Mesh topology works well for 4–6 participants.
 * Not scalable beyond that — would need an SFU.
 */

// STUN servers for NAT traversal
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const useWebRTC = (roomId) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: { stream, userName } }
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Refs to persist across renders
    const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
    const localStreamRef = useRef(null);
    const participantsRef = useRef({}); // { socketId: userName }

    /**
     * Get user media (camera + microphone)
     */
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error('❌ Failed to get local media:', error);
            // Fallback: try audio only
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true,
                });
                localStreamRef.current = audioStream;
                setLocalStream(audioStream);
                return audioStream;
            } catch (audioError) {
                console.error('❌ Failed to get any media:', audioError);
                return null;
            }
        }
    }, []);

    /**
     * Create a new RTCPeerConnection for a remote peer
     */
    const createPeerConnection = useCallback((remoteSocketId, userName) => {
        // Don't create duplicate connections
        if (peerConnections.current[remoteSocketId]) {
            return peerConnections.current[remoteSocketId];
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks to the connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    to: remoteSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setRemoteStreams((prev) => ({
                ...prev,
                [remoteSocketId]: {
                    stream: remoteStream,
                    userName: userName || participantsRef.current[remoteSocketId] || 'Unknown',
                },
            }));
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                removePeerConnection(remoteSocketId);
            }
        };

        peerConnections.current[remoteSocketId] = pc;
        participantsRef.current[remoteSocketId] = userName;

        return pc;
    }, []);

    /**
     * Remove and clean up a peer connection
     */
    const removePeerConnection = useCallback((socketId) => {
        if (peerConnections.current[socketId]) {
            peerConnections.current[socketId].close();
            delete peerConnections.current[socketId];
            delete participantsRef.current[socketId];

            setRemoteStreams((prev) => {
                const updated = { ...prev };
                delete updated[socketId];
                return updated;
            });
        }
    }, []);

    /**
     * Create and send an offer to a remote peer
     */
    const createOffer = useCallback(async (remoteSocketId, userName) => {
        const pc = createPeerConnection(remoteSocketId, userName);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { to: remoteSocketId, offer });
        } catch (error) {
            console.error('❌ Failed to create offer:', error);
        }
    }, [createPeerConnection]);

    /**
     * Handle incoming offer — create answer
     */
    const handleOffer = useCallback(async ({ from, offer }) => {
        const userName = participantsRef.current[from] || 'Unknown';
        const pc = createPeerConnection(from, userName);
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { to: from, answer });
        } catch (error) {
            console.error('❌ Failed to handle offer:', error);
        }
    }, [createPeerConnection]);

    /**
     * Handle incoming answer
     */
    const handleAnswer = useCallback(async ({ from, answer }) => {
        const pc = peerConnections.current[from];
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (error) {
                console.error('❌ Failed to handle answer:', error);
            }
        }
    }, []);

    /**
     * Handle incoming ICE candidate
     */
    const handleIceCandidate = useCallback(async ({ from, candidate }) => {
        const pc = peerConnections.current[from];
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('❌ Failed to add ICE candidate:', error);
            }
        }
    }, []);

    /**
     * Toggle audio mute
     */
    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsAudioMuted((prev) => !prev);
        }
    }, []);

    /**
     * Toggle video on/off
     */
    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff((prev) => !prev);
        }
    }, []);

    /**
     * Clean up all connections and streams
     */
    const cleanup = useCallback(() => {
        // Close all peer connections
        Object.keys(peerConnections.current).forEach((socketId) => {
            peerConnections.current[socketId].close();
        });
        peerConnections.current = {};
        participantsRef.current = {};

        // Stop local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        setLocalStream(null);
        setRemoteStreams({});
    }, []);

    /**
     * Initialize WebRTC — get media and set up socket listeners
     */
    useEffect(() => {
        if (!roomId) return;

        const init = async () => {
            await getLocalStream();

            // ─── Socket Listeners for WebRTC ───

            // When we receive the list of existing participants, create offers to each
            socket.on('room-participants', (participants) => {
                participants.forEach((p) => {
                    if (p.socketId !== socket.id) {
                        participantsRef.current[p.socketId] = p.userName;
                        createOffer(p.socketId, p.userName);
                    }
                });
            });

            // When a new user joins, store their info (they will send us an offer)
            socket.on('user-joined', ({ socketId, userName }) => {
                participantsRef.current[socketId] = userName;
            });

            // Handle incoming signaling data
            socket.on('offer', handleOffer);
            socket.on('answer', handleAnswer);
            socket.on('ice-candidate', handleIceCandidate);

            // When a user leaves, clean up their peer connection
            socket.on('user-left', ({ socketId }) => {
                removePeerConnection(socketId);
            });
        };

        init();

        // Cleanup on unmount
        return () => {
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            cleanup();
        };
    }, [roomId, getLocalStream, createOffer, handleOffer, handleAnswer, handleIceCandidate, removePeerConnection, cleanup]);

    return {
        localStream,
        remoteStreams,
        isAudioMuted,
        isVideoOff,
        toggleAudio,
        toggleVideo,
    };
};

export default useWebRTC;
