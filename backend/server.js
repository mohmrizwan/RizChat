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
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("io", io);
// Pass io to socket handler
chatSocket(io);

// Start server
server.listen(3000, async () => {
  console.log("Server running on port 3000");
  await dbConnect();
});
