import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import cors from "cors"
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.router.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRote from "./routes/courseProgress.route.js";
import adminRoute from "./routes/admin.route.js";
import { createFrontendOriginCheck } from "./utils/frontendOrigins.js";


dotenv.config({});

//call database connection here
connectDB()
const app = express();
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || "0", 10);
app.set("trust proxy", Number.isSafeInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 0);

const PORT = process.env.PORT || 3000;

//default middleware
app.use("/api/v1/purchase/webhook", express.raw({ type: "application/json" }))
app.use(express.json())
app.use(cookieParser())
app.use(helmet());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => req.method !== "POST",
    message: { success: false, message: "Too many attempts. Try again later." },
});

const isAllowedOrigin = createFrontendOriginCheck();

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server and tools that do not send Origin header.
        if (!origin) return callback(null, true)
        if (isAllowedOrigin(origin)) return callback(null, true)
        return callback(new Error("Not allowed by CORS"))
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}))

app.use(["/api/v1/user/login", "/api/v1/user/register", "/api/v1/user/google", "/api/v1/user/forgot-password", "/api/v1/user/reset-password"], authLimiter);

// Ensure DB is connected on every request (serverless-safe)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("DB connection failed for request:", req.path, err.message);
        return res.status(503).json({ success: false, message: "Service temporarily unavailable. Please try again shortly." });
    }
})

//apis
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user",userRoute);
app.use("/api/v1/course",courseRoute);
app.use("/api/v1/purchase",purchaseRoute);
app.use("/api/v1/progress",courseProgressRote);
app.use("/api/v1/admin",adminRoute);


app.listen(PORT, process.env.SERVER_HOST || "0.0.0.0", ()=>{
    console.log(`Server listen at port ${PORT}`)
})
