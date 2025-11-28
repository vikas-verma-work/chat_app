import React, { useEffect, useState } from "react";
import "./titlebar.css";

export default function TitleBar({ title = "Chat App" }) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    console.log("electronAPI?", window.electronAPI);
    if (window?.electronAPI?.isMaximized) {
      window.electronAPI
        .isMaximized()
        .then((res) => setIsMaximized(!!res))
        .catch(() => {});
    }

    if (window?.electronAPI?.onWindowMaximized) {
      window.electronAPI.onWindowMaximized((isMax) => setIsMaximized(!!isMax));
    }
  }, []);

  const onMinimize = () => {
    window?.electronAPI?.minimize?.();
  };
  const onMaximizeToggle = () => {
    window?.electronAPI?.maximizeToggle?.();
  };
  const onClose = () => {
    window?.electronAPI?.close?.();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-area">
        <div className="titlebar-title">{title}</div>
      </div>

      <div className="titlebar-actions">
        <button
          className="tb-btn tb-min"
          onClick={onMinimize}
          aria-label="Minimize"
        >
          —
        </button>
        <button
          className="tb-btn tb-max"
          onClick={onMaximizeToggle}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? "🗗" : "☐"}
        </button>
        <button
          className="tb-btn tb-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
