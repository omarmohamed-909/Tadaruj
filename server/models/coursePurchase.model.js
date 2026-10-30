import mongoose from "mongoose";
const coursePurchaseSchema = new mongoose.Schema({
    courseId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Course",
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:["pending","completed","failed"],
        default:"pending"
    },
    paymentId:{
        type:String,
        required:true
    },
    paymentMethod:{ type:String, enum:["stripe","manual"], default:"stripe" },
    instructorId:{ type:mongoose.Schema.Types.ObjectId, ref:"User", default:null },
    reviewedBy:{ type:mongoose.Schema.Types.ObjectId, ref:"User", default:null },
    reviewedAt:{ type:Date, default:null }
},{timestamps:true});
coursePurchaseSchema.index({ courseId:1, userId:1, paymentMethod:1, status:1 }, {
    unique:true,
    partialFilterExpression:{ paymentMethod:"manual", status:"pending" }
});
coursePurchaseSchema.index({ paymentMethod: 1, status: 1, createdAt: -1 });
coursePurchaseSchema.index({ instructorId: 1, paymentMethod: 1, status: 1, createdAt: -1 });
coursePurchaseSchema.index({ courseId: 1, status: 1, userId: 1 });
export const CoursePurchase = mongoose.model("CoursePurchase",coursePurchaseSchema);
