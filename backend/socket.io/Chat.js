// socket.io/Chat.js

const onlineUsers = new Map();

let ioInstance = null;

export const getIO = () => ioInstance;

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};

const chatSocket = (io) => {
  ioInstance = io;

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

      if (typeof callback === "function") {
        callback();
      }
    });

    // Leave group room
    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);

      console.log(`${socket.id} left room ${roomId}`);
    });

    // client did.
   socket.on("joinConversation", (conversationId, callback) => {

  console.log(
    "JOIN PRIVATE ROOM:",
    conversationId
  );

  socket.join(conversationId.toString());
  if (typeof callback === "function") callback();

  console.log(
    "CURRENT ROOMS:",
    [...socket.rooms]
  );

});

    // ✅ NEW — Leave private conversation room (mirrors leaveRoom)
    socket.on("leaveConversation", (conversationId) => {
      socket.leave(conversationId);

      console.log(`${socket.id} left conversation ${conversationId}`);
    });

    // Optional: Direct socket message sending
    // (If you use API, controller will emit instead)
    socket.on("sendMessage", (data) => {
      const { roomId, message } = data;

      if (!roomId) return;

      io.to(roomId).emit("receiveMessage", message);
    });

    socket.on("typing", ({ chatId, userId, userName, recipientId, isTyping }) => {
      if (!chatId) return;

      const event = isTyping ? "userTyping" : "userStopTyping";
      const payload = {
        chatId,
        userId,
        userName,
        isTyping,
      };
      // Users who already opened this conversation receive the event by room.
      socket.to(chatId).emit(event, payload);

      // The recipient must receive typing even before joining the conversation room.
      const recipientSocketId = recipientId && getReceiverSocketId(recipientId.toString());
      if (recipientSocketId) io.to(recipientSocketId).emit(event, payload);
    });

    // Socket.IO is only used to exchange WebRTC signalling data; call media
    // remains peer-to-peer between browsers.
    socket.on("webrtcSignal", ({ to, signal, callType, callId }) => {
      const recipientSocketId = to && getReceiverSocketId(to.toString());
      if (!recipientSocketId || !socket.userId) return;
      io.to(recipientSocketId).emit("webrtcSignal", {
        from: socket.userId,
        signal,
        callType,
        callId,
      });
    });

    socket.on("webrtcEnd", ({ to, callId }) => {
      const recipientSocketId = to && getReceiverSocketId(to.toString());
      if (recipientSocketId && socket.userId) {
        io.to(recipientSocketId).emit("webrtcEnd", { from: socket.userId, callId });
      }
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
