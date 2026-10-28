import { escapeRegex } from "./courseTaxonomy.js";

export function readAdminUserFilters(query = {}) {
    const { page = "1", limit = "20", q = "", role = "all", status = "all" } = query;
    if (![page, limit].every(value => typeof value === "string" && /^[1-9]\d{0,5}$/.test(value)) ||
        typeof q !== "string" || q.length > 100 ||
        !["all", "student", "instructor", "admin"].includes(role) ||
        !["all", "active", "suspended"].includes(status)) return null;
    const filter = {};
    if (role !== "all") filter.role = role;
    // Older accounts without a stored status are active in authentication too.
    if (status !== "all") filter.status = status === "active" ? { $ne: "suspended" } : "suspended";
    if (q.trim()) {
        const pattern = new RegExp(escapeRegex(q.trim()), "i");
        filter.$or = [{ name: pattern }, { email: pattern }, { role: pattern }];
    }
    return { page: Math.min(Number(page), 100000), limit: Math.min(Number(limit), 50), filter };
}
