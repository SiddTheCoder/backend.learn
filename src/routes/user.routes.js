import {Router} from 'express';
import {loginUser, registerUser, logoutUser , refreshAccessToken , changeCurrentPassword, getCurrentUser , updateUserAvatar , updateUserCoverImage , updateAccountDetails , deletAccount} from '../controllers/users.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/register').post(
    upload.fields([
        {name : 'avatar', maxCount : 1},
        {name : 'coverImage', maxCount : 1}
    ]),
    registerUser
)

router.route('/login').post(loginUser)

// secured routes
router.route('/logout').post(verifyJWT,logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/update-password').post(verifyJWT,changeCurrentPassword)
router.route('/get-user').get(verifyJWT,getCurrentUser)
router.route('/update-account-details').post(verifyJWT,updateAccountDetails)

router.route('/update-avatar').post(
    upload.single("avatar"),
    verifyJWT,
    updateUserAvatar
)
router.route('/update-coverImage').post(
    upload.single("coverImage"),
    verifyJWT,
    updateUserCoverImage
)

router.route('/delete-user').post(verifyJWT,deletAccount)

export default router