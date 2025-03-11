import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'
import { User } from "../models/user.model.js";

// when any paramater is not used then whe can do liek '_'

export const verifyJWT = asyncHandler( async(req,_,next) => {
    try {
        // get the access token from the request headers or cookies
       const token =  req.cookie?.accessToken || req.header('Authorization')?.replace("Bearer ", "")

       // check if the token is provided in the request headers or cookies
       if(!token) throw new ApiError(401,'Unauthorized Request')

        // verify the token signature and extract the user id from it
       const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

       // find user by id and select only necessary fields (excluding password and refreshToken)
       const user = await User.findById(decodedToken._id).select('-password -refreshToken')
       
       // check if user exists and is authenticated (not deleted or suspended)
       if(!user) throw new ApiError(401,'Invalid Access Token')

       // If the token is valid and the user is authenticated then redirect to   the next middleware
       // by attaching the user object to the request object
       req.user = user
       next() 

    }catch (error) {
        throw new ApiError(401,'Unauthorized Acces Token')
    }
} )