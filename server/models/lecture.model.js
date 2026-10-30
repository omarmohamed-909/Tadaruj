import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
    lectureTitle: {
        type: String,
        required: true,
    },
    videoUrl: {type: String,},
    publicId: {type: String,},
    isPreviewFree: {type: Boolean, default: false},
    previewEnabledByAdmin: {type: Boolean, default: false},
    description: {type: String, default: ""},
    attachmentUrl: {type: String, default: ""},
    attachmentPublicId: {type: String, default: ""},
    quizMaxAttempts: { type: Number, default: 3, min: 1, max: 10 },
    quizPassPercentage: { type: Number, default: 60, min: 0, max: 100 },
    quizQuestions: [
        {
            questionText: {
                type: String,
                trim: true,
            },
            questionImageUrl: {
                type: String,
                trim: true,
                default: "",
            },
            questionImagePublicId: {
                type: String,
                trim: true,
                default: "",
            },
            options: {
                type: [String],
                default: [],
            },
            correctOptionIndex: {
                type: Number,
                required: true,
                min: 0,
            },
        }
    ],
}, {timestamps: true});

export const Lecture = mongoose.model("Lecture", lectureSchema);