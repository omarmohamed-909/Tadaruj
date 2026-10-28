import dotenv from "dotenv";
import mongoose from "mongoose";
import { inspectSetup } from "../utils/setupChecks.js";

dotenv.config({ quiet: true });
if (process.argv.includes("--production")) process.env.NODE_ENV = "production";
const report = inspectSetup();
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--services")) {
  const services = {};
  if (report.configured.database) {
    let connection;
    try {
      connection = await mongoose.createConnection(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 }).asPromise();
      const hello = await connection.db.admin().command({ hello: 1 });
      services.database = { connected: true, transactionsSupported: Boolean(hello.setName || hello.msg === "isdbgrid") };
    } catch { services.database = { connected: false }; }
    finally { if (connection) await connection.close(); }
  }
  if (report.configured.email) {
    // A sending-only Resend key has no read-only authentication probe. Do not
    // claim delivery from configuration or send an unexpected message here.
    services.email = { provider: "resend", configured: true, connectionVerified: null, messageSent: false, nextStep: "Run npm run email:test -- --to <your-owned-email> to explicitly test acceptance, then inspect delivery in Resend." };
  }
  if (report.configured.cloudinary) {
    try {
      await import("../utils/cloudinary.js");
      const { v2: cloudinary } = await import("cloudinary");
      await cloudinary.api.ping();
      services.cloudinary = { connectionVerified: true };
    } catch { services.cloudinary = { connectionVerified: false }; }
  }
  console.log(JSON.stringify({ services }, null, 2));
  if (Object.values(services).some((service) => service.connected === false || service.connectionVerified === false || service.transactionsSupported === false)) process.exitCode = 1;
}
if (!report.ready) process.exitCode = 1;
