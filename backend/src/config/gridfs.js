import mongoose from 'mongoose';

/**
 * GridFS Configuration
 * 
 * GridFS is MongoDB's specification for storing large files (>16MB).
 * We use it for file sharing within collaboration rooms.
 * 
 * This file sets up the GridFS bucket once the MongoDB connection is open.
 * The bucket will be initialized and used in Phase 7.
 */

let gridFSBucket;

/**
 * Initialize GridFS bucket.
 * Call this AFTER mongoose connection is established.
 */
const initGridFS = () => {
    const db = mongoose.connection.db;

    if (!db) {
        console.error('❌ Cannot initialize GridFS: No database connection');
        return null;
    }

    gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads', // Collection name prefix: uploads.files + uploads.chunks
    });

    console.log('✅ GridFS bucket initialized');
    return gridFSBucket;
};

/**
 * Get the GridFS bucket instance.
 * Returns null if not yet initialized.
 */
const getGridFSBucket = () => {
    return gridFSBucket;
};

export { initGridFS, getGridFSBucket };
