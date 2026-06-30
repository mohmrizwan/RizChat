import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;
