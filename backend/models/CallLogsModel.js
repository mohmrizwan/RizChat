import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    // Generated client-side (crypto.randomUUID) in MainChat.jsx and sent
    // through every webrtcSignal/webrtcEnd event for a given call — this is
    // the stable key we use to find/update the log, not Mongo's own _id.
    callId: {
      type: String,
      required: true,
      unique: true,
    },

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

    // Frontend sends callType as "audio" | "video" (see requestCallMedia
    // in MainChat.jsx) — kept in sync with that instead of "voice".
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },

    status: {
      type: String,
      enum: ["ringing", "answered", "missed", "rejected", "cancelled"],
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