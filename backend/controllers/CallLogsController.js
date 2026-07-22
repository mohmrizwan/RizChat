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

// GET /callLog/betweenUsers/:otherUserId
// Calls between the logged-in user and one specific other user — used to
// show call events inline inside that 1:1 chat thread.
export const getCallLogsBetweenUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const calls = await CallLog.find({
      $or: [
        { caller: userId, receiver: otherUserId },
        { caller: otherUserId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

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