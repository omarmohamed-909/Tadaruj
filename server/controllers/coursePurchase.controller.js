import { reportError } from "../utils/logger.js";
import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { getProtectedMediaUrl } from "../utils/cloudinary.js";

// New checkout is disabled. Keep Stripe optional only to honor previously created sessions.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const getFrontendBaseUrl = (req) => {
  const requestOrigin = req.headers.origin;

  if (typeof requestOrigin === "string" && /^https?:\/\//i.test(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }

  const configuredOrigin = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean);

  return configuredOrigin.replace(/\/$/, "");
};

const finalizePurchase = async (sessionId, amountTotal) => {
  const purchase = await CoursePurchase.findOne({
    paymentId: sessionId,
  }).populate({ path: "courseId" });

  if (!purchase) {
    throw new Error("Purchase not found!");
  }

  if (purchase.status !== "completed") {
    if (amountTotal) {
      purchase.amount = amountTotal / 100;
    }
    purchase.status = "completed";

    await purchase.save();

    await User.findByIdAndUpdate(
      purchase.userId,
      { $addToSet: { enrolledCourses: purchase.courseId._id } },
      { new: true }
    );

    await Course.findByIdAndUpdate(
      purchase.courseId._id,
      { $addToSet: { enrolledStudents: purchase.userId } },
      { new: true }
    );
  }

  return purchase;
};

const reconcilePendingPurchase = async (purchase) => {
  if (!purchase || purchase.status === "completed" || purchase.paymentMethod === "manual" || !stripe) {
    return purchase;
  }

  const session = await stripe.checkout.sessions.retrieve(purchase.paymentId);

  if (session?.payment_status === "paid") {
    return finalizePurchase(session.id, session.amount_total);
  }

  return purchase;
};

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;
    const frontendBaseUrl = getFrontendBaseUrl(req);

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
      paymentMethod: "stripe",
    });

    // Create a stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "egp",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${frontendBaseUrl}/course-detail/${courseId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/course-detail/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: userId,
      },
      shipping_address_collection: {
        allowed_countries: ["EG"],
      },
    });
    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }

    //save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, //return the stripe url
    });
  } catch (error) {
    reportError("course_purchase.create_checkout_session.failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session.",
    });
  }
};

export const stripeWebhook = async (req, res) => {
  if (!stripe || !process.env.WEBHOOK_ENDPOINT_SECRET) return res.status(503).send("Stripe verification is unavailable.");
  let event;

  try {
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (error) {
    reportError("course_purchase.stripe_webhook.signature_invalid", error, "warn");
    return res.status(400).send("Invalid webhook signature.");
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object;
      await finalizePurchase(session.id, session.amount_total);
    } catch (error) {
      reportError("course_purchase.stripe_webhook.error_handling_event", error);
      return res.status(400).json({ message: "Internal server error" });
    }
  }
  res.status(200).send();
};

export const verifyCheckoutSession = async (req, res) => {
  if (!stripe) return res.status(503).json({ message: "Stripe verification is unavailable." });
  try {
    const { sessionId, courseId } = req.body;
    const userId = req.id;

    if (!sessionId || !courseId) {
      return res.status(400).json({
        message: "Session id and course id are required.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Payment has not been completed yet.",
      });
    }

    if (session.metadata?.courseId !== courseId || session.metadata?.userId !== userId) {
      return res.status(403).json({
        message: "This checkout session does not belong to the current user.",
      });
    }

    await finalizePurchase(session.id, session.amount_total);

    return res.status(200).json({
      success: true,
      message: "Purchase verified successfully.",
    });
  } catch (error) {
    reportError("course_purchase.verify_checkout_session.failed", error);
    return res.status(500).json({
      message: "Failed to verify purchase.",
    });
  }
};
export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const currentUser = await User.findById(userId).select("enrolledCourses");

    const course = await Course.findById(courseId)
      .populate({ path: "creator", select: "name photoUrl emailVerified" })
      .populate({ path: "lectures" });

    if (!course) {
      return res.status(404).json({ message: "Course not found!" });
    }
    const isCourseCreator =
      course.creator?._id?.toString() === userId ||
      course.creator?.toString?.() === userId;
    if (!course.isPublished && !isCourseCreator && req.user?.role !== "admin") {
      return res.status(404).json({ message: "Course not found!" });
    }

    let purchased = await CoursePurchase.findOne({
      userId,
      courseId,
      status: "completed",
    });

    if (!purchased) {
      const pendingPurchase = await CoursePurchase.findOne({
        userId,
        courseId,
        status: "pending",
        paymentMethod: { $ne: "manual" },
      }).sort({ createdAt: -1 });

      if (pendingPurchase) {
        const reconciledPurchase = await reconcilePendingPurchase(pendingPurchase);
        if (reconciledPurchase?.status === "completed") {
          purchased = reconciledPurchase;
        }
      }
    }

    const pendingManualOrder = !purchased ? await CoursePurchase.findOne({
      userId, courseId, status: "pending", paymentMethod: "manual",
    }).select("paymentId createdAt") : null;

    const courseData = course.toObject();
    const lectures = courseData.lectures || [];
    const hasExplicitAdminPreviewConfig = lectures.some(
      (lecture) => typeof lecture.previewEnabledByAdmin === "boolean"
    );
    const allLegacyLecturesMarkedFree =
      lectures.length > 1 && lectures.every((lecture) => Boolean(lecture.isPreviewFree));

    const isFreeCourse = !course.coursePrice || course.coursePrice <= 0;
    const hasManualAccess = currentUser?.enrolledCourses?.some(
      (enrolledCourseId) => enrolledCourseId.toString() === courseId
    ) ?? false;
    const hasAccess = isCourseCreator || req.user?.role === "admin" || isFreeCourse || !!purchased || hasManualAccess;

    courseData.lectures = lectures.map((lecture, index) => {
      let isPreviewFree = false;

      if (typeof lecture.previewEnabledByAdmin === "boolean") {
        isPreviewFree = Boolean(lecture.previewEnabledByAdmin && lecture.isPreviewFree);
      } else if (!hasExplicitAdminPreviewConfig) {
        if (allLegacyLecturesMarkedFree) {
          // Legacy safety: the old purchase bug could mark all lectures as free.
          // In that case keep only the first preview unlocked until the instructor resaves.
          isPreviewFree = index === 0;
        } else {
          // Legacy admin-configured free previews should continue to work.
          isPreviewFree = Boolean(lecture.isPreviewFree);
        }
      }

      const safeLecture = {
        ...lecture,
        isPreviewFree,
      };
      if (!hasAccess) {
        delete safeLecture.attachmentUrl;
        delete safeLecture.attachmentPublicId;
        delete safeLecture.publicId;
        delete safeLecture.quizQuestions;
        if (!isPreviewFree) delete safeLecture.videoUrl;
      }
      if (!isCourseCreator && req.user?.role !== "admin" && Array.isArray(safeLecture.quizQuestions)) {
        safeLecture.quizQuestions = safeLecture.quizQuestions.map((question) => {
          const { correctOptionIndex: _answer, ...safeQuestion } = question;
          return safeQuestion;
        });
      }
      if (safeLecture.videoUrl) safeLecture.videoUrl = getProtectedMediaUrl(safeLecture.videoUrl, lecture.publicId, "video");
      if (safeLecture.attachmentUrl) safeLecture.attachmentUrl = getProtectedMediaUrl(safeLecture.attachmentUrl, lecture.attachmentPublicId, "raw");
      return safeLecture;
    });

    return res.status(200).json({
      course: courseData,
      purchased: !!purchased, // true if purchased , false otherwise
      hasAccess,
      isFreeCourse,
      pendingManualOrder: pendingManualOrder ? { reference: pendingManualOrder.paymentId.replace(/^manual-/, "").slice(0, 12).toUpperCase(), createdAt: pendingManualOrder.createdAt } : null,
    });
  } catch (error) {
    reportError("course_purchase.get_course_detail_with_purchase_status.failed", error);
    return res.status(500).json({ message: "Failed to load course details." });
  }
};

export const getAllPurchasedCourse = async (_, res) => {
  try {
    const pendingPurchases = await CoursePurchase.find({
      status: "pending",
      paymentMethod: { $ne: "manual" },
    });

    await Promise.all(
      pendingPurchases.map(async (purchase) => {
        try {
          await reconcilePendingPurchase(purchase);
        } catch (error) {
          reportError("course_purchase.get_all_purchased_course.failed", error);
        }
      })
    );

    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse:[],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    reportError("course_purchase.get_all_purchased_course.failed", error);
    return res.status(500).json({ message: "Failed to load purchases." });
  }
};
