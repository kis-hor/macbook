const Messages = require("../model/messages");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const cloudinary = require("cloudinary");
const axios = require("axios");
const router = express.Router();

// create new message
router.post(
  "/create-new-message",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messageData = req.body;

      // Validate required fields
      if (!messageData.conversationId || !messageData.sender) {
        return next(new ErrorHandler("Missing required fields: conversationId or sender", 400));
      }

      // Handle image upload if present
      if (messageData.images) {
        try {
          const myCloud = await cloudinary.v2.uploader.upload(messageData.images, {
            folder: "messages",
          });
          messageData.images = {
            public_id: myCloud.public_id,
            url: myCloud.url,
          };
        } catch (error) {
          console.error("Cloudinary upload error:", error);
          return next(new ErrorHandler("Failed to upload image to Cloudinary", 500));
        }
      }

      // Prepare message data
      messageData.isRead = false;

      const message = new Messages({
        conversationId: messageData.conversationId,
        text: messageData.text || "",
        sender: messageData.sender,
        images: messageData.images || undefined,
        isRead: messageData.isRead,
      });

      // Save message
      await message.save();

      // Notify socket server (non-blocking)
      try {
        const conversation = await require("../model/conversation").findById(
          messageData.conversationId
        );
        if (!conversation) {
          console.error("Conversation not found:", messageData.conversationId);
        } else {
          const receiverId = conversation.members.find(
            (member) => member !== messageData.sender
          );
          if (receiverId) {
            console.log(`Sending notification to socket server for receiver: ${receiverId}`);
            await axios.post(
              "http://localhost:4000/notify",
              {
                event: "newMessageNotification",
                data: {
                  messageId: message._id,
                  conversationId: messageData.conversationId,
                  senderId: messageData.sender,
                  text: messageData.text || "Photo",
                  createdAt: message.createdAt,
                  receiverId,
                },
              },
              { timeout: 5000 }
            );
            console.log(`Notification request sent for receiver: ${receiverId}`);
          } else {
            console.error("Receiver ID not found in conversation:", conversation);
          }
        }
      } catch (error) {
        console.error("Socket notification error:", error.message, error.response?.data);
      }

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error("Create message error:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all messages with conversation id
router.get(
  "/get-all-messages/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messages = await Messages.find({
        conversationId: req.params.id,
      });
      res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error("Get messages error:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get unread notifications for a user or seller
router.get(
  "/get-unread-messages/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const conversations = await require("../model/conversation").find({
        members: { $in: [req.params.userId] },
      });

      const conversationIds = conversations.map((conv) => conv._id);
      const messages = await Messages.find({
        conversationId: { $in: conversationIds },
        isRead: false,
        sender: { $ne: req.params.userId },
      }).sort({ createdAt: -1 });

      console.log(`Unread messages for ${req.params.userId}:`, messages.length);
      res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error("Get unread messages error:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Mark messages as read
router.put(
  "/mark-messages-read/:conversationId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return next(new ErrorHandler("Missing userId", 400));
      }
      await Messages.updateMany(
        {
          conversationId: req.params.conversationId,
          sender: { $ne: userId },
          isRead: false,
        },
        { $set: { isRead: true } }
      );
      console.log(`Messages marked as read for conversation: ${req.params.conversationId}`);
      res.status(200).json({
        success: true,
        message: "Messages marked as read",
      });
    } catch (error) {
      console.error("Mark messages read error:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;