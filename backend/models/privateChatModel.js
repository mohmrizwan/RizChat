import mongoose from "mongoose";

const privateChatSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    text: {
      type: String,
      default:"",
      trim: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrivateChat",
      default: null,
    },
    media: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  },
);

const privateChatModel = mongoose.model("PrivateChat", privateChatSchema);

export default privateChatModel;