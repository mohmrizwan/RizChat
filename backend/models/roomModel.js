import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
    },

    roomCode: {
      type: String,
      required: true,
      unique: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const roomModel = mongoose.model("Room", roomSchema);

export default roomModel;