import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
        courseTitle:{
            type:String,
            required:true,
        },
         subTitle:{
            type:String,
        },
        description:{
            type:String,

        },
        // Legacy records stored either a subject or a school grade in category.
        category:{ type:String, default:"" },
        subject:{ type:String, trim:true, default:"", index:true },
        gradeLevel:{ type:String, trim:true, default:"", index:true },
        courseLevel:{
            type:String,
            enum:["Beginner","Medium","Advance"],
        },
        coursePrice:{
            type:Number
        },
        courseThumbnail:{
            type:String,
        },
        enrolledStudents:[
            {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
            }
        ],
        lectures:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref: "Lecture"
            }
        ],
        creator:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        },
        units: { type: [{ title: { type: String, trim: true, maxlength: 100, required: true }, lectureIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }] }], default: [] },
        isPublished:{
            type:Boolean,
            default:false
        }
},{timestamps:true});

courseSchema.index({ creator: 1, isPublished: 1, createdAt: -1, _id: -1 });
courseSchema.index({ isPublished: 1, createdAt: -1, _id: -1 });
courseSchema.index({ isPublished: 1, coursePrice: 1, _id: 1 });

export const Course = mongoose.model("Course",courseSchema);
