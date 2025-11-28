const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const users = new Map();
let messages = [];

app.get("/messages", (req, res) => res.json(messages));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, originalname: req.file.originalname });
});

app.use("/uploads", express.static(uploadDir));

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("register", ({ userId, name }) => {
    users.set(userId, socket.id);
    io.emit("presence", { userId, name, status: "online" });
    socket.emit("users", Array.from(users.keys()));
  });

  socket.on("message", (message) => {
    messages.push(message);
    if (message.to && message.to !== "all") {
      const targetSocketId = users.get(message.to);
      if (targetSocketId) io.to(targetSocketId).emit("message", message);
      const senderSocketId = users.get(message.from);
      if (senderSocketId) io.to(senderSocketId).emit("message", message);
    } else {
      io.emit("message", message);
    }
  });

  socket.on("typing", ({ from, to }) => {
    if (to && to !== "all") {
      const targetSocketId = users.get(to);
      if (targetSocketId) io.to(targetSocketId).emit("typing", { from });
    } else {
      socket.broadcast.emit("typing", { from });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, sid] of users.entries()) {
      if (sid === socket.id) {
        users.delete(userId);
        io.emit("presence", { userId, status: "offline" });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => console.log("Server listening on", PORT));
