import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const getAllVideos = asyncHandler( async(req,res) => {
  try {
      const { username } = req.params 
  
      if(!username) throw new ApiError(400, 'Username is required')
  
  
      let user;   //will be storing user from db 
      if(username){
          user = await User.findOne({username})
          if(!user) throw new ApiError(404, 'Channel Not Found')   
      }
  
      const videos = await Video.aggregate([
          {
              $match : {
                  owner : user._id
              }
          },
          {
              $lookup : {
                  from : 'users',
                  localField : 'owner',
                  foreignField : '_id',
                  as : 'owner',
                  pipeline : [
                      {
                          $project : {
                              fullName : 1,
                              username  :1,
                              avatar  :1
                          }
                      }
                  ]
              }
          },
          // set owner object instead of aaray
          {
              $addFields : {
                  owner : {
                      $first : '$owner'
                  }
              }
          },
      ])
  
      // Handle case when no videos are found
      if(!videos?.length) {
          return res.status(200).json(
              new ApiResponse(
                  200,
                  {
                      videos : [],
                      totalVideos : 0
                  },
                  username ? `No Videos Found for channel : ${username}` : 'No videos Found'
              )
          )
      }
  
      return res
      .status(200)
      .json( new ApiResponse(
          200,
          {
              videos,
              totalVideos : videos.length
          },
          username ? `Videos fetched Succesfully for channel : ${username}` : "All videos fetched Successfully"
      ))
  } catch (error) {
    throw new ApiError(
        error.statusCode || 500,
        error.message || "Error occured while fetching Videos"
    )
  }

})

const uploadVideo = asyncHandler( async(req, res) => {
    const {title, description} = req.body

    if(!title || !description) throw new ApiError(400, 'Titles and Description is required')

    const videoLocalPath = req.files?.videoFile?.[0]?.path 
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path  
    
    if(!videoLocalPath) throw new ApiError(400, 'Video File is required ')
    if(!thumbnailLocalPath) throw new ApiError(400, 'Thumbnail is required ')

    const video = await uploadOnCloudinary(videoLocalPath)    
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!video) throw new ApiError(500, 'Error while Uploading Video')
    if(!thumbnail) throw new ApiError(500, 'Error while Uploading Thumbnail')

    const newVideo = await Video.create({
        title,
        description,
        duration : video.duration,
        videoFile : video.url,
        thumbnail : thumbnail.url,
        owner : req.user._id 
    })
    
    return res
    .status(200)
    .json( new ApiResponse(
        200,
        newVideo,
        'Video Published Successfully'
    ))

})

const getVideoById = asyncHandler ( async (req, res) => {
    const { videoId } = req.params

    if(!videoId) throw new ApiError(400, 'Video ID is required')

    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup  :{
                from : 'users',
                localField : 'owner',
                foreignField : '_id',
                as : 'Owner',
                pipeline : [
                    {
                        $project : {
                            username : 1 ,
                            fullName : 1,
                            avatar : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                owner : {
                    $first : '$owner'
                }
            }
        }
    ])    

    if(!video?.length) throw new ApiError(400, 'Video not Found')

    //increment views
    await Video.findByIdAndUpdate(videoId, {
        $inc : { views : 1 }
    })

    console.log(video)
    
    return res
    .status(200)
    .json( new ApiResponse(
        200,
        video[0],
        'Video Fetched SuccessFully'
    ))
})

const updateVideo = asyncHandler( async (req, res) => {
    const { videoId } = req.params
    const {title , description } = req.body

    if(!videoId) throw new ApiError(400, 'Video Id is required')

    if(!title && !description) throw new ApiError(400,'Atlatest one field is required to update')
        
    const video = await Video.findById(videoId)    

    if(!video) throw new ApiError(400, 'Video Not Found')

        // to check whether the req(user) is authorized to edit the video or not
    if(req.user?._id.toString() !== video.owner.toString()) throw new ApiError(403, 'You are not authorized to update this video')

    const thumbnailLocalPath = req.file?.path
    let thumbnailUrl;
    
    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail) {
            throw new ApiError(500, 'Error while uploading thumbnail')
        }
        thumbnailUrl = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title : title || video.title,
                description : description || video.description,
                thumbnail : thumbnailUrl || video.thumbnail
            }
        },
        { new : true}
    )

    return res
    .status(200)
    .josn( new ApiResponse(
        200,
        updateVideo,
        "Video Updated Successfully"
    ))
})

const deleteVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    if(!videoId) throw new ApiError(400, 'Video ID is required')
    
    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(403, 'Video Not Found')
     
    if(req.user._id.toString() !== video.owner.toString()) throw new ApiError(403, 'You are not authorized to delete this video')    
    
    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json( new ApiResponse( 
        200,
        {},
        'Video Deleted Successfully'
    ))
})

const toggleVideoLike = asyncHandler( async (req, res) => {
    const { videoId } = req.params

    if(!videoId) throw new ApiError(400, 'Video ID is required')

    const video = await Video.findById(videoId)   
    
    if(!video) throw new ApiError(404, 'Video Not Found')

    const isLiked = video.likes.includes(req.user._id)   
    
    const updatedQuery = isLiked ? {
        $pull : { likes : req.user._id}
    } : {
        $addToSet : { likes : req.user._id}
    }

    await Video.findByIdAndUpdate(
        videoId,
        updatedQuery,
        { new : true }
    )

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {liked : !isLiked }
        `Video ${isLiked ? "Disliked" : "liked"} successfully`
    ))
})

export {
    getAllVideos,
    uploadVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    toggleVideoLike
}