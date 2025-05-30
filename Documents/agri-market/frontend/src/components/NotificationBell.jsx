import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { BsBell } from "react-icons/bs";
import axios from "axios";
import { server } from "../server";
import { format } from "timeago.js";
import { useNavigate } from "react-router-dom";
import socketIO from "socket.io-client";

const ENDPOINT = "http://localhost:4000";
const socketId = socketIO(ENDPOINT, { transports: ["websocket"], withCredentials: true });

const NotificationBell = ({ isSeller = false }) => {
  const { user, seller } = useSelector((state) => state.user || state.seller || {});
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const userId = isSeller ? seller?._id : user?._id;

  useEffect(() => {
  if (!userId) {
    console.warn(`User ID is undefined for ${isSeller ? "seller" : "user"} in NotificationBell`);
    return;
  }

    console.log(`NotificationBell initialized for ${isSeller ? "seller" : "user"} ID: ${userId}`);

    // Fetch unread messages
   const fetchNotifications = async () => {
    try {
      const response = await axios.get(
        `${server}/message/get-unread-messages/${userId}`,
        { withCredentials: true }
      );
      setNotifications(response.data.messages || []);
    } catch (error) {
      console.error("Fetch notifications error:", error);
    }
  };


    fetchNotifications();

    // Register user with socket
    socketId.emit("addUser", userId);
    // Listen for new message notifications - modified to handle both user types
    const handleNewNotification = (data) => {
        if (data.senderId !== userId) {
        setNotifications((prev) => [
            {
            _id: data.messageId,
            conversationId: data.conversationId,
            text: data.text,
            createdAt: data.createdAt,
            sender: data.senderId,
            },
            ...prev,
        ]);
        }
    };

    // Keep socket connected
    const interval = setInterval(() => {
      socketId.emit("addUser", userId);
      console.log(`Socket: Re-emitting addUser for ${userId}`);
    }, 10000);

    return () => {
      socketId.off("newMessageNotification");
      clearInterval(interval);
    };
  }, [userId, isSeller]);

  const handleNotificationClick = async (conversationId) => {
    if (!userId) return;
    try {
      await axios.put(
        `${server}/message/mark-messages-read/${conversationId}`,
        { userId },
        { withCredentials: true }
      );
      console.log(`Marked messages as read for conversation: ${conversationId}`);
      setNotifications((prev) =>
        prev.filter((notif) => notif.conversationId !== conversationId)
      );
      navigate(isSeller ? `/dashboard-messages?${conversationId}` : `/inbox?${conversationId}`);
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  };

  // Render nothing or a placeholder if userId is undefined
  if (!userId) {
    return (
      <div className="relative">
        <BsBell size={24} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative cursor-pointer" onClick={() => setOpen(!open)}>
        <BsBell size={24} />
        {notifications.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {notifications.length}
          </span>
        )}
      </div>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-500">No new notifications</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className="p-2 border-b cursor-pointer hover:bg-gray-100"
                  onClick={() => handleNotificationClick(notif.conversationId)}
                >
                  <p className="text-sm">
                    New message: {notif.text?.length > 50 ? notif.text.substring(0, 50) + "..." : notif.text || "Photo"}
                  </p>
                  <p className="text-xs text-gray-500">{format(notif.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;