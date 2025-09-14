import React, { CSSProperties } from "react";
import User from "@/assets/svg/user.svg?react";
import { getFileUrl } from "@/shared/utils/api";

interface Conversation {
  id: string;
  userId: string;
  title: string;
  profilePicture: string | null;
  lastMsgTs?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  threadMap: Record<string, boolean>;
  currentUserId: string;
  isOnline: (id?: string | null) => boolean;
  isMobile: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  threadMap,
  currentUserId,
  isOnline,
  isMobile,
}) => {
  const listItemStyle: CSSProperties = {
    fontSize: "14px",
    padding: "10px",
    cursor: "pointer",
    borderRadius: "5px",
    marginBottom: "1px",
    transition: "0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  };

  return (
    <div
      className="sidebar"
      style={{
        width: isMobile ? "100%" : "25%",
        borderRight: isMobile ? "none" : "1px solid #444",
        background: "#0c0c0c",
      }}
    >
      <div className="sidebar-section">
        <h3
          style={{
            fontSize: "18px",
            background: "linear-gradient(30deg, #181818, #0c0c0c)",
            padding: "15px",
            margin: 0,
          }}
        >
          # Direct Messages
        </h3>
        <div
          style={{
            maxHeight: isMobile ? "calc(100vh - 150px)" : "400px",
            overflowY: "auto",
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {conversations.map((conv, index) => {
              const onlinePeerId = conv.id
                .replace("dm#", "")
                .split("___")
                .find((id) => id !== currentUserId);
              const online = onlinePeerId ? isOnline(onlinePeerId) : false;

              return (
                <li
                  key={`${conv.id}-${conv.userId}-${index}`}
                  onClick={() => onSelect(conv.id)}
                  style={{
                    ...listItemStyle,
                    background: selectedId === conv.id ? "#252525" : undefined,
                    color: selectedId === conv.id ? "#fff" : "#bbb",
                    padding: "10px 15px",
                    position: "relative",
                  }}
                >
                  <div className="avatar-wrapper" style={{ marginRight: 8 }}>
                    <>
                      {conv.profilePicture ? (
                        <img
                          src={getFileUrl(conv.profilePicture)}
                          alt={conv.title}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <User style={{ width: 32, height: 32, opacity: 0.5 }} />
                      )}
                      {online && <span className="online-indicator" />}
                    </>
                  </div>
                  <span style={{ flexGrow: 1, textAlign: "right" }}>{conv.title}</span>
                  {threadMap[conv.id] && (
                    <span
                      style={{
                        background: "#FA3356",
                        color: "#fff",
                        borderRadius: "12px",
                        padding: "2px 6px",
                        fontSize: "12px",
                        marginLeft: "4px",
                      }}
                    >
                      NEW
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConversationList;

