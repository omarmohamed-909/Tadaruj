import mongoose from "mongoose";

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
            serverSelectionTimeoutMS: 50000, // fail fast if Atlas is unreachable
            socketTimeoutMS: 45000,
        })
        .then(() => {
            console.log("MongoDB Connected");
        })
        .catch((error) => {
            console.error("MongoDB connection error:", error.message);
            connectionPromise = null; // allow retry on next request
            throw error;             // propagate so the request gets a 503
        });

    return connectionPromise;
};

export default connectDB;