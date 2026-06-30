import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

const app = express();
const port = 3000;

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

export default app;
