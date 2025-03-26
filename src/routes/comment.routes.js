import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getComments,
  postComment,
  updateComment,
  deleteComment
} from "../controllers/comment.controller.js"

const router = Router()

// unsecured routes
router.route('/get-comments/:videoId').get(getComments)

//secured Routes
router.route('/post-comment/:videoId').post(verifyJWT,postComment)
router.route('/update-comment/:commentId').post(verifyJWT,updateComment)
router.route('/delete-comment/:commentId').post(verifyJWT,deleteComment)

export default router