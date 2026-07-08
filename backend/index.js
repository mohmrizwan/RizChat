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

const app = express();

// Middleware
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use("/user", authRoutes);
app.use("/room", roomRoutes);
app.use("/message", messageRoutes);
app.use("/block", blockRoutes)
app.use("/privateChat", privateChat);

export default app;
