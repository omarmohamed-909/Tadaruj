import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("mongoose", () => ({ default: { connection: { readyState: 0 }, connect: vi.fn() } }));
vi.mock("../utils/logger.js", () => ({ logger: vi.fn() }));
import mongoose from "mongoose";
import connectDB from "../database/db.js";

beforeEach(() => { mongoose.connection.readyState = 0; vi.stubEnv("MONGO_URI", "mongodb://unit.invalid/test"); });
afterEach(() => vi.unstubAllEnvs());
describe("database connection lifecycle", () => {
  it("shares a cold connection and reconnects after losing it", async () => {
    let complete;
    mongoose.connect.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const first = connectDB(); const second = connectDB();
    expect(mongoose.connect).toHaveBeenCalledOnce();
    complete(); await Promise.all([first, second]);
    mongoose.connection.readyState = 1;
    await connectDB();
    expect(mongoose.connect).toHaveBeenCalledOnce();
    mongoose.connection.readyState = 0;
    mongoose.connect.mockResolvedValueOnce();
    await connectDB();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });
  it("bounds connection selection, avoids buffered commands, and retries safely after failure", async () => {
    mongoose.connect.mockRejectedValueOnce(new Error("mongodb://private:password@host"));
    await expect(connectDB()).rejects.toThrow("Database unavailable.");
    expect(mongoose.connect).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ serverSelectionTimeoutMS: 8000, bufferCommands: false }));
    mongoose.connect.mockResolvedValueOnce(); await connectDB();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });
});
