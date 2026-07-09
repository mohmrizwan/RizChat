// socket.io/Chat.js

const onlineUsers = new Map();

export const getReceiverSocketId = (userId) => onlineUsers.get(userId);

const chatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("userOnline", (userId) => {
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("joinConversation", (conversationId, callback) => {
      socket.join(conversationId);
      if (typeof callback === "function") callback();
    });

    socket.on("joinRoom", (roomId, callback) => {
      socket.join(roomId);
      if (typeof callback === "function") callback();
    });

    socket.on("typing", ({ chatId, targetId, userId, userName, isTyping }) => {
      const roomId = chatId || targetId;
      if (!roomId) return;

      const eventName = isTyping ? "userTyping" : "userStopTyping";
      socket.to(roomId).emit(eventName, {
        chatId: roomId,
        userId,
        userName,
        isTyping,
      });
    });

    socket.on("stopTyping", ({ chatId, targetId, userId, userName }) => {
      const roomId = chatId || targetId;
      if (!roomId) return;

      socket.to(roomId).emit("userStopTyping", {
        chatId: roomId,
        userId,
        userName,
        isTyping: false,
      });
    });

    // ✅ Fixed: only remove a user from the online map if THIS socket is
    // still the one on record for them. Without this guard, a race where
    // a new socket (e.g. after a refresh/reconnect) registers itself
    // BEFORE the old socket's disconnect event fires would get wiped out
    // by the old socket's disconnect handler — even though the user is
    // still actually connected via the new socket. That's what was
    // causing different clients to disagree about who's online.
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