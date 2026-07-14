// socket.io/Chat.js
// Server-side logic is already correct — io.to(roomId).emit() only
// reaches sockets that are members of that room. No changes needed here.
// The leak was happening on the client (see ChatRoom.jsx + socket.js).

const onlineUsers = new Map();

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};

const chatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User online
    socket.on("userOnline", (userId) => {
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Join group room
    socket.on("joinRoom", (roomId, callback) => {
      socket.join(roomId);
      console.log(`${socket.id} joined room ${roomId}`);
      if (typeof callback === "function") callback();
    });

    // Leave group room
    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      console.log(`${socket.id} left room ${roomId}`);
    });

    // Send group message
    socket.on("sendMessage", (data) => {
      const { roomId, message, sender } = data;
      if (!roomId) return;

      // Only sends to sockets currently in that room
      io.to(roomId).emit("receiveMessage", {
        roomId,
        message,
        sender,
        createdAt: new Date(),
      });
    });

    // Typing indicator
    socket.on("typing", ({ roomId, userId, userName, isTyping }) => {
      if (!roomId) return;
      socket.to(roomId).emit("userTyping", { roomId, userId, userName, isTyping });
    });

    // Stop typing
    socket.on("stopTyping", ({ roomId, userId, userName }) => {
      if (!roomId) return;
      socket.to(roomId).emit("userStopTyping", {
        roomId,
        userId,
        userName,
        isTyping: false,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
        onlineUsers.delete(socket.userId);
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      }
    });
  });
};

export default chatSocket;