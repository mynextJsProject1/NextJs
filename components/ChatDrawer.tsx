
"use client";

import { useState } from "react";

type ChatDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ChatDrawer({
  isOpen,
  onClose,
}: ChatDrawerProps) {
  const [message, setMessage] = useState("");

  function handleSend() {
    if (!message.trim()) return;

    setMessage("");
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="stake-chat-overlay"
          aria-label="Close chat"
          onClick={onClose}
        />
      )}

      <section
        className={`stake-chat-drawer ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
      >
        <header className="stake-chat-header">
          <div>
            <h2>Live Chat</h2>
            <span className="stake-chat-status">
              <i className="fa-solid fa-circle" /> Online
            </span>
          </div>

          <button
            type="button"
            className="stake-chat-close"
            aria-label="Close chat"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="stake-chat-messages">
          <p>Welcome! How can we help you?</p>
        </div>

        <form
          className="stake-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message..."
            aria-label="Chat message"
          />

          <button type="submit" aria-label="Send message">
            <i className="fa-solid fa-paper-plane" />
          </button>
        </form>
      </section>
    </>
  );
}
