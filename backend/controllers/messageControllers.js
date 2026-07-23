import fs from "fs";
import path from "path";
import messageModel from "../models/messageModel.js";
import roomModel from "../models/roomModel.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const sendMessage = async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  try {
    const senderId = req.user.id;
    const { roomId, text, replyTo } = req.body;

    if (!roomId || (!text?.trim() && !req.file)) {
      return res.status(400).json({ message: "Message can't be empty" });
    }

    let media = null;
    let mediaType = null;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "rizchat/chat-media",
        resource_type: "auto",
      });
      media = uploadResult.secure_url;
      mediaType = req.file.mimetype.startsWith("image/")
        ? "image"
        : req.file.mimetype.startsWith("video/")
          ? "video"
          : req.file.mimetype.startsWith("audio/")
            ? "audio"
          : "file";
    }

    if (replyTo) {
      const existingReply = await messageModel.findById(replyTo);
      if (
        !existingReply ||
        existingReply.room.toString() !== roomId.toString()
      ) {
        return res.status(400).json({ message: "Invalid reply target" });
      }
    }

    const newMessage = await messageModel.create({
      room: roomId,
      sender: senderId,
      text: text?.trim() || "",
      media,
      mediaType,
      replyTo: replyTo || null,
    });
    await roomModel.findByIdAndUpdate(roomId, {
      lastMessage: text,
      lastMessageAt: new Date(),
    });

    const populatedMessage = await messageModel
      .findById(newMessage._id)
      .populate("sender", "name")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      });

    const io = req.app.get("io");
    io.to(roomId.toString()).emit("receiveMessage", populatedMessage);

    return res.status(200).json({ message: populatedMessage });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await roomModel.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const isMember = room.members.some(
      (member) => member.toString() === userId,
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    const messages = await messageModel
      .find({ room: roomId })
      .populate("sender", "name")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      })
      .sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const seenMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    await messageModel.updateMany(
      {
        room: roomId,
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
      io.to(roomId.toString()).emit("messagesSeen", {
        roomId,
        seenBy: userId,
      });
      io.emit("messagesSeen", {
        roomId,
        seenBy: userId,
      });
    }

    return res.status(200).json({
      message: "Messages seen",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const editMessage = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message can't be empty" });
    }

    const message = await messageModel.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only edit your own messages",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Deleted messages can't be edited",
      });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // ✅ Keep the room's sidebar preview in sync if this was the latest message
    const latestMessage = await messageModel
      .findOne({ room: message.room })
      .sort({ createdAt: -1 });

    if (latestMessage && latestMessage._id.toString() === message._id.toString()) {
      await roomModel.findByIdAndUpdate(message.room, {
        lastMessage: message.text,
      });
    }

    const io = req.app.get("io");
    if (io && message.room) {
      io.to(message.room.toString()).emit("messageEdited", {
        messageId: message._id,
        roomId: message.room,
        text: message.text,
        isEdited: true,
        editedAt: message.editedAt,
      });
    }

    return res.status(200).json({
      message: "Message updated successfully",
      updatedMessage: {
        _id: message._id,
        text: message.text,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { messageId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const message = await messageModel.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own messages",
      });
    }

    if (message.media && !/^https?:\/\//i.test(message.media)) {
      const filePath = path.join(process.cwd(), message.media);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log("Failed to delete media file:", err.message);
        }
      });
    }

    message.isDeleted = true;
    message.text = "This message was deleted";
    message.media = null;
    message.mediaType = null;
    await message.save();

    const io = req.app.get("io");

    if (io && message.room) {
      io.to(message.room.toString()).emit("messageDeleted", {
        messageId: message._id,
      });
    } else {
      console.log(
        "⚠️ Could not emit messageDeleted — io:",
        !!io,
        "room:",
        message.room,
      );
    }

    return res.status(200).json({
      message: "Message deleted successfully",
      updatedMessage: message,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};