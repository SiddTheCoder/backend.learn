import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'; // file system module

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET 
});

const uploadOnCloudinary  = async function(localFilePath){
    try {
        if(!localFilePath) return null; // file not found
        // save the file to the cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        console.log('File uploaded successfully to cloudinary ', response.url);

        // delete the file from local server
        // setTimeout(() => {
        //     fs.unlinkSync(localFilePath); // delete the file
        // }, 3000);

        // return the response to user
        return response;

    } catch (error) {
        //   delete the file from local server
        //   setTimeout(() => {
        //     fs.unlinkSync(localFilePath); // delete the file
        // }, 3000);
        console.error('Error uploading file to cloudinary ', error);
    }
}

export { uploadOnCloudinary }