import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";


const getComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  if (!videoId) throw new ApiError(400, 'Video ID is required')
  
  const video = await Video.findById(videoId).populate({
      path: 'comments',
      select : 'text',
      populate: {
        path: 'user',
        select : 'fullName email'
      }
    }).populate({
      path: 'owner',
      select : 'username fullName'
    }).select('owner')
  
  if(!video) throw new ApiError(404, 'Video with Such ID didnt Found')
  
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      video,
      'Comments Fetched Successfully'
  ))
})

const postComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { text } = req.body
  const userId = req.user?._id

  if (!videoId) {
    throw new ApiError(400, 'Video ID is required to Post Comment')
  }

  if (!text) {
    throw new ApiError(400, 'Text is required for comment')
  }

  const video = await Video.findById(videoId)

  if(!video) throw new ApiError(404, 'No Video Found')
  
  const comment = await Comment.create({
    text : text,
    video: videoId,
    user : userId
  })


  video.comments.push(comment?._id)
  
  //saving video
  await video.save()

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      comment,
      'Comments Added Successfully'
  ))

})

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  if (!commentId) throw new ApiError(400, "Comment ID is required")
  
  const { text } = req.body
  if(!text) throw new ApiError(400, 'New Comment is Required')
  
  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      text: text || comment.text,
    },
    { new : true}
  )

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      comment,
      'Comment Updated Successfully'
  ))
})

const deleteComment = asyncHandler(async (req, res) => {

  const { commentId } = req.params 
  if (!commentId) throw new ApiError(400, 'Comment ID is required')
  // also learn the concept about how the frontned will knwo the commentId for the CRUD operation ..

  const comment = await Comment.findById(commentId)
  if (!comment) throw new ApiError(404, 'No Comment Found with such ID')
  

  if (!comment.user.equals(req.user?._id)) {
    throw new ApiError(403,'You are not Authorized to Delete this comment')
  }

  await Comment.findByIdAndDelete(commentId)

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      {},
      'Comment Deleted Successfully'
  ))
  
})

export {
  postComment,
  getComments,
  updateComment,
  deleteComment,

}