import conversationModel from "../models/conversationModel.js";
import privateChatModel from "../models/privateChatModel.js";
import mongoose from "mongoose";

export const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recieverId } = req.body;

    console.log(req.body);
    console.log(recieverId);

    const conversation = await conversationModel.findOne({
      participants: {
        $all: [userId, recieverId],
      },
    });

    if (conversation) {
      return res.status(200).json({ conversation });
    }
    const newConversation = await conversationModel.create({
      participants: [userId, recieverId],
    });

    return res.status(201).json({ conversation: newConversation });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ✅ NEW: bulk-fetch every conversation's last message + unread count in ONE call,
// so the sidebar can be sorted correctly on page load — without waiting for the
// user to click into each chat first.
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await conversationModel
      .find({ participants: userId })
      .populate({
        path: "lastMessage",
        select: "text mediaType isDeleted createdAt sender",
      })
      .lean();

    const conversationIds = conversations.map((c) => c._id);

    const unreadCounts = await privateChatModel.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          seen: false,
        },
      },
      { $group: { _id: "$conversation", count: { $sum: 1 } } },
    ]);

    const unreadMap = {};
    unreadCounts.forEach((u) => {
      unreadMap[u._id.toString()] = u.count;
    });

    const result = conversations.map((c) => {
      const otherUserId = c.participants.find(
        (p) => p.toString() !== userId.toString(),
      );

      return {
        conversationId: c._id,
        otherUserId,
        lastMessage: c.lastMessage || null,
        // null (not 0) when there's no message yet, so the frontend can tell
        // "genuinely no messages" apart from "not loaded yet"
        lastMessageAt: c.lastMessage?.createdAt || null,
        unreadCount: unreadMap[c._id.toString()] || 0,
      };
    });

    return res.status(200).json({ conversations: result });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};