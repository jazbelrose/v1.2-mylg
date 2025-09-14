import React, { useState } from "react";

interface MessageInputProps {
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
  onFocus?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ value, onChange, onSend, onFocus }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}>
      <input
        type="text"
        placeholder="Type a message..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSend();
          }
        }}
        style={{
          flexGrow: 1,
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #444",
          background: "#1c1c1c",
          color: "#fff",
        }}
        aria-label="Message input"
      />
      <button
        onClick={() => setShowEmojiPicker((p) => !p)}
        style={{ background: "none", border: "none", cursor: "pointer" }}
        aria-label="Toggle emoji picker"
      >
        😊
      </button>
      {showEmojiPicker && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            background: "#333",
            padding: 5,
            borderRadius: 8,
            display: "flex",
            gap: 4,
          }}
        >
          {["😀", "😂", "👍", "❤️", "✅", "💯"].map((em) => (
            <span
              key={em}
              style={{ cursor: "pointer" }}
              onClick={() => {
                onChange(value + em);
                setShowEmojiPicker(false);
              }}
            >
              {em}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={onSend}
        style={{
          padding: "10px 15px",
          background: "#FA3356",
          border: "none",
          borderRadius: "6px",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;

