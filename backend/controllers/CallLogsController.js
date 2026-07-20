import CallLog from "../models/CallLogsModel.js";

// GET /callLog/myCalls
export const getMyCallLogs = async (req, res) => {
  try {
    const userId = req.user.id;

    const calls = await CallLog.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate("caller", "name profilePic")
      .populate("receiver", "name profilePic")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      message: "Call logs fetched successfully",
      calls,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};