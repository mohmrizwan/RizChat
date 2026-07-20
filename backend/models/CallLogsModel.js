import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },

    type: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "ringing",
        "answered",
        "missed",
        "rejected",
        "cancelled",
      ],
      default: "ringing",
    },

    startedAt: Date,
    endedAt: Date,

    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CallLog", callLogSchema);