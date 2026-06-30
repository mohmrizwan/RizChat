import mongoose from "mongoose";

const dbConnect = async()=>{
    try{

       await mongoose.connect(process.env.MONGO_URI);
        console.log("connected db")
    }
    catch(err){
        console.log("connection failed", err)
    }

}

export default dbConnect;