import mongoose, {Schema} from "mongoose";
import jwt from "jwt";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    name: {
        type : 'string',
        required : true,
        lowercase : true,
        unique : true,
        trim : true,
        index : true,
    },
    email: {
        type : 'string',
        required : true,
        lowercase : true,
        unique : true,
        trim : true,
    },
    fullName: {
        type : 'string',
        required : true,
        trim : true,
    },
    password: {
        type : 'string',
        required : true,
    },
    avatar: {
        type : 'string', // url link from cloudnary server
        required : true,
    },
    coverImage: {
        type : 'string', // url link from cloudnary server
        required : true,
    },
    wtachHistory: {
        type : [
            {
                type : Schema.Types.ObjectId,
                ref : 'Video'
            }
        ],
    },
    refreshToken:{
        type : 'string',
    }

},{timestamps: true});

//bcrpyt password just before saving
userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next()
    this.password = bcrypt.hash(this.password, 10)
    next()
})

//compare password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

//generate Access token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            username : this.username,
            email : this.email,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

//generate Refresh token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User', userSchema)