import conversationModel from "../models/conversationModel.js";

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