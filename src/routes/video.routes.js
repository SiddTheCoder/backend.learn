import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    getAllVideos,
    uploadVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    toggleVideoLike 
} from "../controllers/video.controller.js"; 



const router = Router();

router.route('/getVideos/:username').get(getAllVideos)
router.route('/getVideoByID/:videoId').get(getVideoById)

//secured routes

router.route('/upload-video').post(
    upload.fields([
        {name : 'videoFile', maxCount : 1},
        {name : 'thumbnail', maxCount : 1}
    ]),
    verifyJWT,
    uploadVideo
)

router.route('/update-video/:videoId').post(
    upload.single('thumbnail'),
    verifyJWT,
    updateVideo
)

router.route('/delete-video/:videoId').post(verifyJWT,deleteVideo)

router.route('/toggle-video-like/:videoId').post(verifyJWT,toggleVideoLike)



export default router