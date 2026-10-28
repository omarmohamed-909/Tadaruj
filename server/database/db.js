import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

// Cache the connection promise so concurrent cold-start requests
// all wait on the same connection instead of racing.
let connectionPromise = null;

const connectDB = async () => {
    // Already connected – reuse.
    if (mongoose.connection.readyState === 1) return;

    // Connection in progress – wait for it.
    if (connectionPromise) return connectionPromise;

    connectionPromise = mongoose
        .connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
        })
        .then(() => {
            logger("info", "database.connected");
        })
        .catch(() => { throw new Error("Database unavailable."); })
        .finally(() => { connectionPromise = null; }); // Retry after a failed or lost connection.

    return connectionPromise;
};

export default connectDB;
