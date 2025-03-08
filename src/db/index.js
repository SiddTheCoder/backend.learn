import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// Connect to MongoDB
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`Connected to MongoDB at ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log('Connecting to MongoDB FAILED', error);
        process.exit(1)
    }
}

export default connectDB;