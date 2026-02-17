import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import API from '../api/axios';
import socket from '../socket/socket';

/**
 * FilePanel Component
 * 
 * File sharing sidebar for collaboration rooms.
 * - Upload files (stored in GridFS via backend)
 * - View file list
 * - Download files
 * - Real-time updates when others upload files
 */
const FilePanel = ({ roomId, isVisible }) => {
    const { user } = useAuthStore();
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    /**
     * Load existing files for this room
     */
    useEffect(() => {
        if (!roomId || !isVisible) return;

        const fetchFiles = async () => {
            try {
                const { data } = await API.get(`/files/room/${roomId}`);
                setFiles(data.data);
            } catch (err) {
                console.error('Failed to load files:', err);
            }
        };

        fetchFiles();

        // Listen for new file uploads from other users
        const handleFileUploaded = (fileData) => {
            setFiles((prev) => [...prev, fileData]);
        };

        socket.on('file-uploaded', handleFileUploaded);

        return () => {
            socket.off('file-uploaded', handleFileUploaded);
        };
    }, [roomId, isVisible]);

    /**
     * Handle file upload
     */
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const { data } = await API.post(`/files/upload/${roomId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Add to local list
            setFiles((prev) => [...prev, data.data]);

            // Notify other users via socket
            socket.emit('file-uploaded', { roomId, file: data.data });
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    /**
     * Handle file download
     */
    const handleDownload = (fileId, filename) => {
        const token = localStorage.getItem('token');
        // Open download in new tab with auth
        window.open(`/api/files/download/${fileId}?token=${token}`, '_blank');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 z-40 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-4 py-4 border-b border-slate-700">
                <h3 className="text-white font-semibold">Files</h3>
            </div>

            {/* Upload Button */}
            <div className="px-4 py-3 border-b border-slate-700">
                <label className={`w-full py-2.5 flex items-center justify-center rounded-lg text-sm font-medium transition cursor-pointer ${isUploading
                        ? 'bg-blue-600/50 text-blue-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    {isUploading ? 'Uploading...' : '📎 Upload File'}
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                </label>
                {error && (
                    <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                {files.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center mt-8">No files shared yet</p>
                ) : (
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div
                                key={file.fileId || index}
                                className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-white text-sm truncate">{file.filename}</p>
                                    <p className="text-slate-400 text-xs">
                                        {file.uploadedBy?.name || 'Unknown'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDownload(file.fileId, file.filename)}
                                    className="ml-3 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition cursor-pointer shrink-0"
                                >
                                    ⬇️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilePanel;
