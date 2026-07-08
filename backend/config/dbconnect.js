import mongoose from "mongoose";

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");
    } catch (err) {
        console.log("MongoDB connection failed:", err.message);
        process.exit(1);
    }
};

export default dbConnect;