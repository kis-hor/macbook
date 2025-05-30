const mongoose = require("mongoose");

const messagesSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
    },
    text: {
      type: String,
    },
    sender: {
      type: String,
    },
    images: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    isRead: {
      type: Boolean,
      default: false, // New messages are unread by default
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Messages", messagesSchema);
