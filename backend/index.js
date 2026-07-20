import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import privateChat from "./routes/conversationRoutes.js";
import blockRoutes from "./routes/blockRoutes.js";
import callLogRoutes from "./routes/callLogsRoutes.js";

const app = express();

// Middleware
app.use(cookieParser());

const allowedOrigins = ["http://localhost:5173", "https://riz-chat.vercel.app"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);
console.log({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  secret_last_4: process.env.CLOUDINARY_API_SECRET?.slice(-4),
  secret_length: process.env.CLOUDINARY_API_SECRET?.length,
});

app.use("/user", authRoutes);
app.use("/room", roomRoutes);
app.use("/message", messageRoutes);
app.use("/block", blockRoutes);
app.use("/privateChat", privateChat);
app.use("/callLog", callLogRoutes);

export default app;