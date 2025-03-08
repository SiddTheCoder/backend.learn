import dotenv from 'dotenv'
import connectDB from './db/index.js'
import app from './app.js'

dotenv.config({
    path: './env',
})



connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    })
})
.catch((err) => console.log(err))


















// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
// import express from "express";

// const app = express();
// // Connect to MongoDB
// ( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
//         app.on('error', (error) => {
//             console.log('Error connecting to MongoDB', error);
//             throw new Error('Error connecting to MongoDB');
//         })
//         app.listen(process.env.PORT, () => {
//             console.log(`Server running on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.log(error)
//         throw error
//     }
// })()