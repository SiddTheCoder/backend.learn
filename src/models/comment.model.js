import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema({
  text: {
    type: String,
    required: true,
    createdAt: {
      type: Date,
      default : Date.now
      }
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required : true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required : true
  }
}, {timestamps : true})

export const Comment = mongoose.model('Comment', commentSchema)