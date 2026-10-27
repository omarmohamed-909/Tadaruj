import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        trim:true,
        lowercase:true,
        unique:true,
        index:true,
    },
    password:{
        type:String,
        required: function () { return !this.googleId; }
    },
    googleId: { type: String, unique: true, sparse: true },
    role:{
        type:String,
        enum:["admin", "instructor", "student"],
        default:'student'
    },
    status:{
        type:String,
        enum:["active", "suspended"],
        default:"active"
    },
    enrolledCourses:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Course'
        }
    ],
    photoUrl:{
        type:String,
        default:""
    },
    instructorBio:{ type:String, trim:true, maxlength:600, default:"" },
    instructorSubjects:{ type:[{ type:String, trim:true, maxlength:60 }], default:[] },
    instructorWhatsapp:{ type:String, trim:true, default:"" },
    emailVerified:{
        type:Boolean,
        default:false
    },
    emailVerificationSentAt:{
        type:Date,
        default:null
    },
    resetPasswordExpires:{
        type:Date,
        default:null
    }
},{timestamps:true})

userSchema.index({ role: 1, status: 1, name: 1, _id: 1 });

// Keep the provider identifier private in API responses without hiding it from validation.
const hideGoogleId = (_doc, result) => { delete result.googleId; return result; };
userSchema.set("toJSON", { transform: hideGoogleId });
userSchema.set("toObject", { transform: hideGoogleId });

export const User = mongoose.model("User",userSchema)
