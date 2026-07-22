// socket.io/Chat.js
console.log("=== CALLLOG_DEBUG_BUILD_v2 — Chat.js loaded ===");
import CallLog from "../models/CallLogsModel.js";

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
      console.log(`[userOnline] Registered userId=${userId} -> socket=${socket.id}`);

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
      console.log("JOIN PRIVATE ROOM:", conversationId);

      socket.join(conversationId.toString());
      if (typeof callback === "function") callback();

      console.log("CURRENT ROOMS:", [...socket.rooms]);
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
    // remains peer-to-peer between browsers. The frontend generates a
    // callId (crypto.randomUUID) on the caller's side and sends it with
    // every signal for that call, so we key the CallLog off that id.
    socket.on("webrtcSignal", async ({ to, signal, callType, callId }, callback) => {
      console.log(
        `[webrtcSignal] from=${socket.userId} to=${to} type=${signal?.type} callId=${callId}`
      );

      const recipientSocketId = to && getReceiverSocketId(to.toString());

      // Log the call attempt regardless of whether the recipient is
      // currently online — an unreachable callee should still show up
      // in call history as a missed call, not vanish silently.
      try {
        if (callId && signal?.type === "offer" && socket.userId) {
          const result = await CallLog.findOneAndUpdate(
            { callId },
            {
              $setOnInsert: {
                callId,
                caller: socket.userId,
                receiver: to,
                type: callType === "video" ? "video" : "audio",
                status: "ringing",
                startedAt: new Date(),
              },
            },
            { upsert: true, new: true }
          );
          console.log("[webrtcSignal] CallLog upserted on offer:", result?._id?.toString());
        } else if (callId && signal?.type === "answer") {
          const result = await CallLog.findOneAndUpdate(
            { callId, status: "ringing" },
            { status: "answered" },
            { new: true }
          );
          console.log(
            "[webrtcSignal] CallLog marked answered:",
            result ? result._id.toString() : "NO MATCHING DOC FOUND"
          );
        }
      } catch (err) {
        console.error("[webrtcSignal] CallLog logging error:", err.message);
      }

      if (!recipientSocketId || !socket.userId) {
        console.log(
          `[webrtcSignal] Recipient unreachable — recipientSocketId=${recipientSocketId} socket.userId=${socket.userId}`
        );
        // Recipient isn't online to receive the offer at all — close the
        // log out as missed right away instead of leaving it stuck "ringing".
        try {
          if (callId && signal?.type === "offer") {
            await CallLog.findOneAndUpdate(
              { callId },
              { status: "missed", endedAt: new Date() }
            );
          }
        } catch (err) {
          console.error("[webrtcSignal] CallLog unreachable-close error:", err.message);
        }
        if (typeof callback === "function") {
          callback({ delivered: false, message: "That user is offline or unavailable." });
        }
        return;
      }

      io.to(recipientSocketId).emit("webrtcSignal", {
        from: socket.userId,
        signal,
        callType,
        callId,
      });
      if (typeof callback === "function") callback({ delivered: true });
    });

    socket.on("webrtcEnd", async ({ to, callId }) => {
      console.log(`[webrtcEnd] from=${socket.userId} to=${to} callId=${callId}`);

      const recipientSocketId = to && getReceiverSocketId(to.toString());

      try {
        if (callId) {
          const call = await CallLog.findOne({ callId });
          if (!call) {
            console.log("[webrtcEnd] NO CallLog FOUND for callId:", callId);
          } else if (call.endedAt) {
            console.log("[webrtcEnd] Call already closed:", callId);
          } else {
            const end = new Date();
            call.endedAt = end;

            if (call.status === "answered") {
              call.duration = Math.max(
                0,
                Math.floor((end - call.startedAt) / 1000)
              );
            } else if (socket.userId?.toString() === call.receiver.toString()) {
              // Receiver ended it before answering = declined.
              call.status = "rejected";
            } else {
              // Caller ended it before the other side answered = cancelled/no answer.
              call.status = "missed";
            }

            await call.save();
            console.log(
              `[webrtcEnd] CallLog closed: status=${call.status} duration=${call.duration}`
            );
          }
        }
      } catch (err) {
        console.error("[webrtcEnd] CallLog logging error:", err.message);
      }

      if (recipientSocketId && socket.userId) {
        io.to(recipientSocketId).emit("webrtcEnd", {
          from: socket.userId,
          callId,
        });
      }
    });

    // Small-group WebRTC mesh signalling. Each participant makes one direct
    // peer connection to every other participant in the active room call.
    socket.on("joinGroupCall", (roomId, callback) => {
      if (!roomId || !socket.userId) return;
      const callRoom = `group-call:${roomId}`;
      const participants = [...(io.sockets.adapter.rooms.get(callRoom) || [])]
        .map((socketId) => io.sockets.sockets.get(socketId)?.userId)
        .filter(Boolean);
      socket.join(callRoom);
      socket.to(callRoom).emit("groupCallParticipantJoined", { roomId, userId: socket.userId });
      if (typeof callback === "function") callback(participants);
    });

    socket.on("leaveGroupCall", (roomId) => {
      if (!roomId || !socket.userId) return;
      const callRoom = `group-call:${roomId}`;
      socket.leave(callRoom);
      socket.to(callRoom).emit("groupCallParticipantLeft", { roomId, userId: socket.userId });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
        for (const room of socket.rooms) {
          if (room.startsWith("group-call:")) {
            socket.to(room).emit("groupCallParticipantLeft", {
              roomId: room.replace("group-call:", ""),
              userId: socket.userId,
            });
          }
        }
        onlineUsers.delete(socket.userId);

        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      }
    });
  });
};

export default chatSocket;