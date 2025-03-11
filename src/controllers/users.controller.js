import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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


const registerUser = asyncHandler( async (req,res) => {
    
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
    if( [username,email,fullName,password].some( (field) => field.trim() === '' ) ) {
        throw new ApiError(400,'All fields are required')
    }

    // check if username or email is already registered
    const existedUser = await User.find({
        $or: [{ username },{ email }]
    })
    if( existedUser.length > 0 ) throw new ApiError(400,'Username or Email is already registered')

    // uplaod avatar and coverImage to local server by multer
    console.log(req.files)
    const avatarLocalPath = req.files?.avatar?.length ? req.files.avatar[0].path : null;
    const coverImageLocalPath = req.files?.coverImage?.length ? req.files.coverImage[0].path : null;
    
    
    // upload those images to cloudinary server 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)   

    // check if avatar is uploaded to cloudinary successfully or not
    if(!avatar) throw new ApiError(400,'Avatar is required')

    // create a new user object - entry into database
    const user =  await User.create({
        username : username.toLowerCase(),
        email : email.toLowerCase(),
        fullName,
        password,
        avatar : avatar.url,
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

const logoutUser = asyncHandler( async (req,res) => {
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

export { registerUser , loginUser, logoutUser}