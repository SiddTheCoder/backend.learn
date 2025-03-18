import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})   

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(error.status || 500, error.message)
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    // get data from request body
    // validate request body - not empty 
    // check if username or email is already registered
    // uplaod avatar and coverImage to local server by multer 
    // check if avatar is uploaded successfully or not
    // upload those images to cloudinary server
    // create a new user object - entry into database
    // check for user creation 
    // remove token and password from user object then
    // send response to client

    // get data from request body
    const {username,email,fullName,password} = req.body 
 
    // validate fields
    if( [username,email,fullName,password].some( (field) => field?.trim() === '' ) ) {
        throw new ApiError(400,'All fields are required')
    }

    // check if username or email is already registered
    const existedUser = await User.find({
        $or: [{ username },{ email }]
    })
    if( existedUser.length > 0 ) throw new ApiError(400,'Username or Email is already registered')

    // uplaod avatar and coverImage to local server by multer
    const avatarLocalPath = req.files?.avatar?.length ? req.files.avatar[0].path : null;
    const coverImageLocalPath = req.files?.coverImage?.length ? req.files.coverImage[0].path : null;
    
    
    // upload those images to cloudinary server 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)   

    // check if avatar is uploaded to cloudinary successfully or not
    if(!avatar) throw new ApiError(400,'Avatar is required')

    // create a new user object - entry into database
    const user =  await User.create({
        username : username?.toLowerCase(),
        email : email?.toLowerCase(),
        fullName,
        password,
        avatar : avatar?.url ,
        coverImage : coverImage?.url || "" ,
    }) 
    
    // check for user creation
    const createdUser = await User.findById(user._id).select('-password -refreshToken')
    if(!createdUser) throw new ApiError(500,'User not created')

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
} )

const loginUser = asyncHandler( async (req, res) => {
    // get data from request body
    // validate request body - not empty 
    // check if user exists with provided email and password
    // generate JWT token
    // send response to client

    // get data from request body
    const {username, email, password} = req.body

    // validate request body - not empty
    if(!(username || email)) throw new ApiError(500,'username or email not found')
    
    // check for username or email exist in db or not 
    const user = await User.findOne({
        $or : [{username} , {email}]
    })

    // check if user exists
    if(!user) throw new ApiError(400,'User does not exist')

    // comparing the userPassword with Db password through User Data Model
    const isPasswordValid = await user.isPasswordCorrect(password) 
    
    // check if password is correct
    if(!isPasswordValid) throw new ApiError(400,'Password is incorrect')

    // generate JWT token for user
    const {refreshToken,accessToken} = await generateAccessAndRefreshToken(user._id)

    // remove password and refreshToken from user object
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

    // cookie settings
    const options = {
        httpOnly : true,
        secure : true,
    }

    // send response to client with JWT token in cookies
    return res.
    status(200).
    cookie('refreshToken', refreshToken, options).
    cookie('accessToken', accessToken, options).
    json(new ApiResponse(
        200, 
        {
            user : loggedInUser, accessToken , refreshToken : refreshToken
        }, 
        'User logged in successfully'
    ))

})

const logoutUser = asyncHandler( async (req, res) => {
    // we have already req.user which is coming from verifyJWT middleware
    // and from req.user we can get ._id easily : See in User Model Jwt
    // clear refreshToken from db
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {refreshToken : undefined}
        },
        {new : true}
    )

    // deleting cookies from client side
    const options= {
        httpOnly : true,
        secure : true,
    }

    return res.
    status(200).
    clearCookie("refreshToken", options).
    clearCookie("accessToken", options).
    json( new ApiResponse(
            200,
            {},
            'User logged out successfully'
        ) )
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    try {
        
        // get refresh token from cookies or body
       const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

       // check if refresh token is provided or not
       if(!incomingRefreshToken) throw new ApiError(401,'Refresh Token is required')

        // verify the refresh token
       const decodedToken =  jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

       // check if user exists or not
       const user = await User.findById(decodedToken._id)

       // check if user exists or not in db or not in database
       if(!user) throw new ApiError(401,'User with this token does not exist')

        // check if the db_refreshToken is valid with incoming refreshToken
       if(incomingRefreshToken !== user?.refreshToken){
              throw new ApiError(401,'Invalid Refresh Token')
       }

       // generate new access and refresh token for user
       const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

       // options for cookies to secure and httpOnly
       const options = {
              httpOnly : true,
              secure : true,
       }

       // send response to client with JWT token in cookies
       return res
       .status(200)
       .cookie('accessToken', accessToken, options)
       .cookie('refreshToken', refreshToken, options)
       .json( new ApiResponse(
                    200, 
                   {accessToken, refreshToken},
                   'Access token refreshed successfully'
                ) )
        
    } catch (error) {
        throw new ApiError(500, error.message)
    }
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    // Get current password
    const {oldPassword, newPassword} = req.body

    if(!oldPassword || !newPassword) throw new ApiError(400,`Invalid password`)
    // Get user from middleware chain 
    const user = await User.findById(req.user?._id)
    if(!user) throw new ApiError(404, "User not found ")
    // compare with old password
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    // if not correct throw error 400 - Incorrect old password
    if(!isPasswordCorrect) throw new ApiError(400,'Incorrect old password')
      
    // Get new password in user object    
    user.password = newPassword
    // Save new password to database  (validateBeforeSave: false to prevent mongoose from validating password)  // mongoose automatically encrypts password before saving it to db  (not in this case)
    await user.save({validateBeforeSave: false})    

    // send response to client  // user object is not returned because password is encrypted and not in user object
    return res
    .status(200)
    .json( new ApiResponse(
            200,
             {},
             'Password changed successfully'
         ) 
    )
} )

const getCurrentUser = asyncHandler( async (req, res) => {
    // Get user from middleware chain  // req.user is coming from verifyJWT middleware 
    const currentUser = req.user 
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            currentUser,
            'User retrieved successfully'
        )
    )
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    // get updated account details from request body  // req.user is coming from verifyJWT middleware  // req.user._id is coming from verifyJWT middleware  // findByIdAndUpdate method returns updated user object  // select method is used to exclude password and refreshToken from updated user object  // new : true is used to return updated user object  // mongoose automatically encrypts password before saving it to db  (not in this case)  // findByIdAndUpdate method returns updated user object
    const {email, username, fullName} = req.body

    if(!(email || username || fullName)) {
        throw new ApiError(400,'All fields are required')
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set  : {
                email : email?.toLowerCase(),
                username : username?.toLowerCase(),
                fullName
            }
        },
        { new : true}
    ).select('-password -refreshToken')

    // if(!user) throw new ApiError(500, 'User not found', user)
    console.log(req.user._id)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            'Account details updated successfully'
        )
    )
})

const updateUserAvatar = asyncHandler( async(req, res) => {
    // get updated avatar from request body  // req.user is coming from verifyJWT middleware  // req.user._id is coming from verifyJWT middleware  // findByIdAndUpdate method returns updated user object  // select method is used to exclude password and refreshToken from updated user object  // new : true is used to return updated user object  // mongoose automatically encrypts password before saving it to db  (not in this case)  // findByIdAndUpdate method returns updated user object

    const avatarLocalPath = req.file?.path
    console.log('Files : --',req.file)
    if(!avatarLocalPath) throw new ApiError(404, 'Avatar Not Found')
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar) throw new ApiError(404, 'Error while uploading avatarr on cloudinary')

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {avatar : avatar.url}
        },
        {new : true}
    ).select('-password -refreshToken')   
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            'Avatar updated successfully'
        )
    )
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
    // get updated cover image from request body  // req.user is coming from verifyJWT middleware  // req.user._id is coming from verifyJWT middleware  // findByIdAndUpdate method returns updated user object  // select method is used to exclude password and refreshToken from updated user object  // new : true is used to return updated user object  // mongoose automatically encrypts password before saving it to db  (not in this case)  // findByIdAndUpdate method returns updated user object

    const coverLocalPath = req.file?.path
    if(!coverLocalPath) throw new ApiError(404, 'Cover Image Not Found')
    const coverImage = await uploadOnCloudinary(coverLocalPath)
    if(!coverImage) throw new ApiError(404, 'Error uploading cover image on cloudinary')  
        
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {coverImage : coverImage.url}
        },
        {new : true}
    ).select('-password -refreshToken')

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            'Cover Image updated successfully'
        )
    )
} );

const deletAccount = asyncHandler( async (req, res) => {
    
        const {username, password} = req.body
        if(!username || !password) throw new ApiError(400,'Username and Password must be provided')

        const user = await User.findById(req.user?._id)    
        const isPasswordCorrect = await user.isPasswordCorrect(password)
        if(!isPasswordCorrect) throw new ApiError(400,'Incorrect Password')

        await User.findByIdAndDelete(req.user?._id)
    

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            'Account deleted successfully'
        )
    )
})




export { registerUser , loginUser, logoutUser , refreshAccessToken , changeCurrentPassword ,  getCurrentUser , updateAccountDetails, updateUserAvatar , updateUserCoverImage , deletAccount }