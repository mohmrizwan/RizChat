import fs from "fs";
import path from "path";
import privateChatModel from "../models/privateChatModel.js";
import conversationModel from "../models/conversationModel.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const sendPrivateMessage = async (req, res) => {
  try {
    const sender = req.user?.id || req.user?._id;
    const { conversationId, text, replyTo } = req.body;
    const file = req.file;

    if (!sender) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        message: "Conversation is required",
      });
    }

    // User must send either text or media
    if ((!text || text.trim() === "") && !file) {
      return res.status(400).json({
        message: "Please send text or media.",
      });
    }

    // Find conversation
    const conversation = await conversationModel.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    // Check participant
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === sender.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    // Media
    let media = null;
    let mediaType = null;

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, {
        folder: "rizchat/chat-media",
        resource_type: "auto",
      });
      media = uploadResult.secure_url;

      if (file.mimetype.startsWith("image")) {
        mediaType = "image";
      } else if (file.mimetype.startsWith("video")) {
        mediaType = "video";
      } else if (file.mimetype === "application/pdf") {
        mediaType = "pdf";
      } else {
        mediaType = "file";
      }
    }

    if (replyTo) {
      const existingReply = await privateChatModel.findById(replyTo);
      if (!existingReply || existingReply.conversation.toString() !== conversationId.toString()) {
        return res.status(400).json({ message: "Invalid reply target" });
      }
    }

    // Save message
    let message = await privateChatModel.create({
      sender,
      conversation: conversationId,
      text: text ? text.trim() : "",
      media,
      mediaType,
      replyTo: replyTo || null,
    });

    // Update last message
    conversation.lastMessage = message._id;
    await conversation.save();

    // Populate sender and reply preview
    message = await privateChatModel
      .findById(message._id)
      .populate("sender", "name email")
      .populate({ path: "replyTo", populate: { path: "sender", select: "name email" } });

    // Socket.IO
    const io = req.app.get("io");

    if (io) {
      io.to(conversationId.toString()).emit("receivePrivateMessage", message);
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      privateMessage: message,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getPrivateMessages = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const conversation = await conversationModel.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === userId.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    const messages = await privateChatModel
      .find({ conversation: conversationId })
      .populate("sender", "name email")
      .populate({ path: "replyTo", populate: { path: "sender", select: "name email" } })
      .sort({ createdAt: 1 }); // oldest first, so chat reads top-to-bottom

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("getPrivateMessages error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const deletePrivateMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await privateChatModel.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        message: "You can only delete your own messages",
      });
    }

    // ✅ FIX: check the message's own media field, not message.includes(media)
    if (message.media && !/^https?:\/\//i.test(message.media)) {
      const filePath = path.join(process.cwd(), message.media);

      fs.unlink(filePath, (err) => {
        if (err) {
          // Don't fail the whole request if the file is already gone
          console.log("Failed to delete media file:", err.message);
        }
      });
    }

    message.isDeleted = true;
    message.text = "This message was deleted";
    message.media = null;       // ✅ clear so frontend stops trying to render it
    message.mediaType = null;
    await message.save();

    const io = req.app.get("io");

    io.to(message.conversation.toString()).emit("messageDeleted", {
      messageId,
    });

    return res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
export const seenPrivateMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await privateChatModel.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        seen: false,
      },
      {
        $set: {
          seen: true,
        },
      },
    );

    const io = req.app.get("io");
    if (io) {
      io.to(conversationId.toString()).emit("privateMessagesSeen", {
        conversationId,
        seenBy: userId,
      });
      io.emit("privateMessagesSeen", {
        conversationId,
        seenBy: userId,
      });
    }

    return res.status(200).json({
      message: "Messages seen successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
