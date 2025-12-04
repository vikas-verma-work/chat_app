console.log("[child] started. PID:", process.pid);

process.on("message", (msg) => {
  if (!msg || typeof msg !== "object") return;

  const { type, id, payload } = msg;

  switch (type) {
    case "simpleMessage": {
      console.log("[child] simpleMessage payload:", payload);

      if (process.send) {
        process.send({
          type: "childBroadcast",
          payload: "Child got your message: " + JSON.stringify(payload),
        });
      }
      break;
    }

    case "request": {
      console.log("[child] request id:", id, "payload:", payload);

      const result = `Child processed: ${payload}`;

      if (process.send) {
        process.send({
          type: "response",
          __replyTo: id,
          payload: result,
        });
      }
      break;
    }

    default: {
      console.log("[child] unknown message type:", type, msg);
    }
  }
});
