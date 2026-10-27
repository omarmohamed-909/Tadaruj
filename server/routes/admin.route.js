import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import { acceptAdminInvitation, createAdminInvitation, getAuditLogs } from "../controllers/admin.controller.js";

const router = express.Router();
router.post("/invitations/:token/accept", isAuthenticated, acceptAdminInvitation);
router.post("/invitations", isAuthenticated, authorizeRoles("admin"), createAdminInvitation);
router.get("/audit-logs", isAuthenticated, authorizeRoles("admin"), getAuditLogs);
export default router;
