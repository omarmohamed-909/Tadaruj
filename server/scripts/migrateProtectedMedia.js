import dotenv from "dotenv";
import connectDB from "../database/db.js";
import { Lecture } from "../models/lecture.model.js";
import { migrateAssetToAuthenticated } from "../utils/cloudinary.js";

dotenv.config({});
await connectDB();

const lectures = await Lecture.find({
  $or: [
    { videoUrl: { $regex: "/video/upload/" }, publicId: { $nin: [null, ""] } },
    { attachmentUrl: { $regex: "/raw/upload/" }, attachmentPublicId: { $nin: [null, ""] } },
  ],
}).select("videoUrl publicId attachmentUrl attachmentPublicId");

if (process.env.APPLY_MEDIA_MIGRATION !== "true") {
  console.log(`Dry run: ${lectures.length} lecture(s) contain legacy public paid media.`);
  console.log("Set APPLY_MEDIA_MIGRATION=true only after taking a database backup to migrate them.");
  process.exit(0);
}

let migrated = 0;
let failed = 0;
for (const lecture of lectures) {
  try {
    if (lecture.videoUrl?.includes("/video/upload/") && lecture.publicId) {
      const result = await migrateAssetToAuthenticated(lecture.publicId, "video");
      if (!result.secure_url?.includes("/video/authenticated/")) throw new Error("Unexpected video migration result");
      lecture.videoUrl = result.secure_url;
      await lecture.save();
      migrated += 1;
    }
    if (lecture.attachmentUrl?.includes("/raw/upload/") && lecture.attachmentPublicId) {
      const result = await migrateAssetToAuthenticated(lecture.attachmentPublicId, "raw");
      if (!result.secure_url?.includes("/raw/authenticated/")) throw new Error("Unexpected PDF migration result");
      lecture.attachmentUrl = result.secure_url;
      await lecture.save();
      migrated += 1;
    }
  } catch (error) {
    failed += 1;
    console.error(`Lecture ${lecture._id} migration failed:`, error?.message || error);
  }
}

console.log(`Protected media migration finished: ${migrated} asset(s) updated, ${failed} lecture(s) failed.`);
process.exit(failed ? 1 : 0);
