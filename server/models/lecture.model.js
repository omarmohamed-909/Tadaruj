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