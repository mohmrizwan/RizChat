import blockModel from "../models/blockModel.js";
import { getReceiverSocketId } from "../socket.io/Chat.js";

export const blockUser = async (req, res) => {
  try {
    const blocker = req.user.id;
    const receiverId = req.body.receiverId || req.body.recieverId;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver id is required" });
    }

    const alreadyBlocked = await blockModel.findOne({
      blocker,
      blocked: receiverId,
    });

    if (alreadyBlocked) {
      return res.status(400).json({ message: "User already blocked" });
    }

    const blockeCreate = await blockModel.create({
      blocker,
      blocked: receiverId,
    });

    const io = req.app.get("io");
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit("userBlocked", {
        blockedBy: blocker,
      });
    }

    res.status(200).json({
      success: true,
      isBlocked: true,
      blockedMe: false,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

// controllers/blockController.js

export const checkBlockStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const receiverId = req.params.receiverId;

    // Did I block this user?
    const iBlocked = await blockModel.findOne({
      blocker: currentUserId,
      blocked: receiverId,
    });

    // Did this user block me?
    const blockedMe = await blockModel.findOne({
      blocker: receiverId,
      blocked: currentUserId,
    });

    return res.status(200).json({
      success: true,
      isBlocked: !!iBlocked,
      blockedMe: !!blockedMe,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const blocker = req.user.id;
    const receiverId = req.body.receiverId || req.body.recieverId;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver id is required" });
    }

    const blockRecord = await blockModel.findOne({
      blocker,
      blocked: receiverId,
    });

    if (!blockRecord) {
      return res.status(404).json({ message: "Block record not found" });
    }

    await blockModel.deleteOne({
      blocker,
      blocked: receiverId,
    });

    const io = req.app.get("io");
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit("userUnblocked", {
        unblockedBy: blocker,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      isBlocked: false,
      blockedMe: false,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};