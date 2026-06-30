import messageModel from "../models/messageModel.js";
import roomModel from "../models/roomModel.js";

export const sendMessage = async (req, res) => {
  try {
    const { roomId, text } = req.body;
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
        message: "You are not a member",
      });
    }

    const message = await messageModel.create({
      sender: userId,
      room: roomId,
      text,
    });

    const populatedMessage = await messageModel
      .findById(message._id)
      .populate("sender", "name");

    const io = req.app.get("io");

    io.to(roomId).emit("receiveMessage", populatedMessage);

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
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

export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await messageModel.findById(messageId);

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

    const io = req.app.get("io");

    io.to(message.room.toString()).emit("messageDeleted", {
      messageId,
    });

    await message.deleteOne();

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
