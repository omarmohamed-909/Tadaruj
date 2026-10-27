import express from "express";
import { rateLimit } from "express-rate-limit";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import { getAllPurchasedCourse, getCourseDetailWithPurchaseStatus, stripeWebhook, verifyCheckoutSession } from "../controllers/coursePurchase.controller.js";
import { requestManualOrder, listManualOrders, reviewManualOrder } from "../controllers/manualOrder.controller.js";

const router = express.Router();
const manualOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  keyGenerator: (req) => String(req.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many order requests. Please try again later." },
});

router.post("/manual-orders", isAuthenticated, manualOrderLimiter, requestManualOrder);
router.get("/manual-orders", isAuthenticated, listManualOrders);
router.patch("/manual-orders/:orderId", isAuthenticated, reviewManualOrder);
router.route("/checkout/verify-session").post(isAuthenticated, verifyCheckoutSession);
router.route("/webhook").post(stripeWebhook);
router.route("/course/:courseId/detail-with-status").get(isAuthenticated,getCourseDetailWithPurchaseStatus);

router.route("/").get(isAuthenticated,authorizeRoles("admin"),getAllPurchasedCourse);

export default router;
