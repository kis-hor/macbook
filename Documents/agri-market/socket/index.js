const socketIO = require("socket.io")
const http = require("http")
const express = require("express")
const cors = require("cors")
const app = express()
const server = http.createServer(app)
const io = socketIO(server)

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Socket server is running")
})

// Handle notification from backend
app.post("/notify", (req, res) => {
  const { event, data } = req.body;
  if (!event || !data) {
    console.error("Invalid notify payload:", req.body);
    return res.status(400).json({ error: "Missing event or data" });
  }
  if (event === "newMessageNotification") {
    const user = getUser(data.receiverId);
    if (user) {
      io.to(user.socketId).emit("newMessageNotification", data);
      console.log(`Notification emitted to ${data.receiverId} (socket: ${user.socketId})`);
    } else {
      console.log(`User ${data.receiverId} not connected`);
    }
  }
  res.status(200).json({ success: true });
});


let users = []

// Add a user to the socket connection
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) && users.push({ userId, socketId })
}

// Remove a user from the socket connection
const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId)
}

// Get a user by userId
const getUser = (userId) => {
  return users.find((user) => user.userId === userId)
}

// Socket connection
io.on("connection", (socket) => {
  console.log("A user connected")

  // Take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id)
    io.emit("getUsers", users)
  })

  // Send and get messages
  socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
    const user = getUser(receiverId)
    if (user) {
      io.to(user.socketId).emit("getMessage", {
        senderId,
        text,
        images,
      })
    }
  })

  // Send notification
  socket.on("sendNotification", (data) => {
    const user = getUser(data.userId)
    if (user) {
      io.to(user.socketId).emit("getNotification", data)
    }
  })

  // Disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected")
    removeUser(socket.id)
    io.emit("getUsers", users)
  })
})

server.listen(4000, () => {
  console.log("Socket server is running on port 4000")
})
