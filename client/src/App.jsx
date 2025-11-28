import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import TitleBar from "./components/TitleBar";

const SERVER_WS = import.meta.env.VITE_WS || "http://localhost:4000";
const SERVER_HTTP = import.meta.env.VITE_HTTP || "http://localhost:4000";

export default function App() {
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [typingFrom, setTypingFrom] = useState(null);
  const [loginInput, setLoginInput] = useState("");
  const socketRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const socket = io(SERVER_WS);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register", { userId, name: userId });
    });

    socket.on("users", (users) => setConnectedUsers(users));

    socket.on("presence", (p) => {
      setConnectedUsers((prev) =>
        p.status === "online"
          ? Array.from(new Set([...prev, p.userId]))
          : prev.filter((u) => u !== p.userId)
      );
    });

    socket.on("message", (m) => setMessages((prev) => [...prev, m]));

    socket.on("typing", ({ from }) => {
      setTypingFrom(from);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTypingFrom(null), 2000);
    });

    axios
      .get(SERVER_HTTP + "/messages")
      .then((r) => setMessages(r.data))
      .catch(() => {});

    return () => socket.disconnect();
  }, [userId]);

  const sendMessage = () => {
    if (!text && !replyTo) return;
    const msg = {
      id: uuidv4(),
      from: userId,
      to: selectedUser,
      text,
      replyTo: replyTo ? replyTo.id : null,
      time: Date.now(),
    };
    if (socketRef.current && socketRef.current.connected)
      socketRef.current.emit("message", msg);
    setText("");
    setReplyTo(null);
  };

  const handleTyping = () => {
    if (!socketRef.current || !socketRef.current.connected) return;
    socketRef.current.emit("typing", { from: userId, to: selectedUser });
  };

  const onDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await axios
      .post(SERVER_HTTP + "/upload", form)
      .catch(() => null);
    if (!res || !res.data) return;
    const msg = {
      id: uuidv4(),
      from: userId,
      to: selectedUser,
      text: `${file.name} (file)`,
      file: res.data.url,
      replyTo: replyTo ? replyTo.id : null,
      time: Date.now(),
    };
    if (socketRef.current && socketRef.current.connected)
      socketRef.current.emit("message", msg);
    setReplyTo(null);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 rounded shadow bg-white">
          <h2 className="text-xl font-bold mb-4">Enter a username</h2>
          <input
            className="border p-2 w-72"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
          />
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                if (!loginInput.trim()) return alert("Enter a valid username");
                localStorage.setItem("userId", loginInput.trim());
                setUserId(loginInput.trim());
              }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <TitleBar title="Chat App" />
      <div className="flex h-[calc(100vh-36px)]">
        <div className="w-72 bg-white border p-4">
          <h3 className="font-bold mb-2">People</h3>
          <div className="mb-4">
            <button
              className={`block w-full text-left p-2 rounded ${
                selectedUser === "all" ? "bg-slate-200" : ""
              }`}
              onClick={() => setSelectedUser("all")}
            >
              All (group)
            </button>
          </div>
          {connectedUsers
            .filter((u) => u !== userId)
            .map((u) => (
              <div
                key={u}
                className={`p-2 rounded cursor-pointer border-b ${
                  selectedUser === u ? "bg-slate-200" : ""
                }`}
                onClick={() => setSelectedUser(u)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium capitalize">{u}</div>
                  <div className="text-xs text-green-600">online</div>
                </div>
              </div>
            ))}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="border-b p-3 bg-white flex items-center justify-between">
            <div>
              <div className="font-bold">Chat ({selectedUser})</div>
              <div className="text-sm text-gray-500">
                You: {userId}{" "}
                {typingFrom && (
                  <span className="text-xs text-blue-600">
                    • {typingFrom} is typing...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto p-4"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {messages
              .filter((m) => {
                if (m.to === "all") return true;
                if (selectedUser === "all") {
                  return false;
                }
                const isFromMeToSelected =
                  m.from === userId && m.to === selectedUser;
                const isFromSelectedToMe =
                  m.from === selectedUser && m.to === userId;

                return isFromMeToSelected || isFromSelectedToMe;
              })
              .map((m) => (
                <div
                  key={m.id}
                  className={`mb-3 ${m.from === userId ? "text-right" : ""}`}
                >
                  <div className="inline-block max-w-[70%] p-3 rounded shadow bg-white">
                    <div className="text-xs text-gray-500">
                      {m.from} • {new Date(m.time).toLocaleTimeString()}
                    </div>

                    {m.replyTo &&
                      (() => {
                        const repliedMsg = messages.find(
                          (msg) => msg.id === m.replyTo
                        );
                        if (!repliedMsg) return null;
                        return (
                          <div className="text-sm text-gray-400 italic border-l-2 pl-2 mb-1">
                            Replying to: "{repliedMsg.text}"
                          </div>
                        );
                      })()}
                    <div className="mt-1">
                      {m.text}{" "}
                      {m.file && (
                        <div>
                          <a
                            href={SERVER_HTTP + m.file}
                            target="_blank"
                            rel="noreferrer"
                          >
                            download
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs flex gap-2">
                      <button
                        onClick={() => setReplyTo(m)}
                        className="underline"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(JSON.stringify(m));
                          alert("copied message JSON");
                        }}
                        className="underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="p-3 bg-white border-t">
            {replyTo && (
              <div className="mb-2 text-sm text-gray-600">
                Replying to: {replyTo.text}{" "}
                <button
                  className="ml-2 text-xs"
                  onClick={() => setReplyTo(null)}
                >
                  cancel
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  handleTyping();
                }}
                className="flex-1 p-2 border rounded"
                placeholder="Type a message or drag & drop a file"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
