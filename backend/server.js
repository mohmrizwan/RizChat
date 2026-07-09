import http from "http";
import { Server } from "socket.io";
import app from "./index.js";
import chatSocket from "./socket.io/Chat.js";
import dbConnect from "./config/dbconnect.js";

// Create HTTP server from Express app
const server = http.createServer(app);

// Attach Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://riz-chat.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("io", io);
// Pass io to socket handler
chatSocket(io);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await dbConnect();
});
