import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import API from '../api/axios';

/**
 * Dashboard Page
 * - Create a new room (generates unique roomId, redirects)
 * - Join an existing room by roomId
 * - Logout
 */
const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const [joinRoomId, setJoinRoomId] = useState('');
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCreateRoom = async () => {
        setError('');
        setIsCreating(true);
        try {
            const { data } = await API.post('/rooms/create');
            navigate(`/room/${data.data.roomId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!joinRoomId.trim()) {
            setError('Please enter a Room ID');
            return;
        }

        setError('');
        setIsJoining(true);
        try {
            await API.post(`/rooms/join/${joinRoomId.trim()}`);
            navigate(`/room/${joinRoomId.trim()}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Room not found');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Top Bar */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">
                    STD<span className="text-blue-500">collab</span>
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-slate-300 text-sm">
                        Welcome, <span className="text-white font-medium">{user?.name || 'User'}</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-6 py-12">
                <h2 className="text-3xl font-bold text-white mb-8">Dashboard</h2>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Create Room Card */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-3">Create Room</h3>
                        <p className="text-slate-400 text-sm mb-5">
                            Start a new collaboration room and invite others.
                        </p>
                        <button
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isCreating ? 'Creating...' : '+ Create Room'}
                        </button>
                    </div>

                    {/* Join Room Card */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-3">Join Room</h3>
                        <p className="text-slate-400 text-sm mb-5">
                            Enter a room ID to join an existing session.
                        </p>
                        <form onSubmit={handleJoinRoom} className="space-y-3">
                            <input
                                type="text"
                                value={joinRoomId}
                                onChange={(e) => { setError(''); setJoinRoomId(e.target.value); }}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="Enter Room ID"
                            />
                            <button
                                type="submit"
                                disabled={isJoining}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isJoining ? 'Joining...' : 'Join Room'}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
