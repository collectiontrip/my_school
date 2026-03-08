import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./PrivateChat.css";
import CallPanel from "../call/CallPanel";
import AxiosInstance from "../auth/axiosInstance";

import {
  getRealtimeSocket,
  addRealtimeListener,
  removeRealtimeListener
} from "../../socket/socketManager";

const PrivateChat = () => {
  const { userId } = useParams();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [otherUsername, setOtherUsername] = useState("");
  const [onlineStatus, setOnlineStatus] = useState("offline");
  const [lastSeen, setLastSeen] = useState(null);

  const [isTyping, setIsTyping] = useState(false);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const myId = Number(localStorage.getItem("user_id"));
  const token = localStorage.getItem("accessToken");
  const otherUserId = Number(userId);

  // ------------------------------
  // Auto Scroll
  // ------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------------------
  // Format Time
  // ------------------------------
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // ------------------------------
  // Date Label
  // ------------------------------
  const formatDateLabel = (dateString) => {
    const msgDate = new Date(dateString);
    const today = new Date();
    const diffTime = today - msgDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7)
      return msgDate.toLocaleDateString("en-US", { weekday: "long" });
    return msgDate.toLocaleDateString();
  };

  // ------------------------------
  // Last Seen Format
  // ------------------------------
  const formatLastSeen = (time) => {
    if (!time) return "";
    const d = new Date(time);
    return "Last seen " + d.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short"
    });
  };

  // ------------------------------
  // Fetch Messages
  // ------------------------------
  const fetchMessages = async (convId) => {
    try {
      const res = await AxiosInstance.get(
        `/chat/conversations/${convId}/messages/`
      );

      const formatted = res.data.map((m) => ({
        id: m.id,
        self: m.sender.id === myId,
        message: m.text,
        from_user: m.sender.username,
        created_at: m.created_at
      }));

      setMessages(formatted);
    } catch (err) {
      console.error("Message fetch error", err);
    }
  };

  // ------------------------------
  // Fetch Other User
  // ------------------------------
  const fetchOtherUser = async () => {
    try {
      const res = await AxiosInstance.get(`/auth/users/${otherUserId}/`);
      setOtherUsername(res.data.username);
      setOnlineStatus(res.data.is_online ? "online" : "offline");
      setLastSeen(res.data.last_seen || null);
    } catch (err) {
      console.error("User fetch error", err);
    }
  };

  // ------------------------------
  // Handle Incoming WS Messages
  // ------------------------------
  const handleRealtimeMessage = useCallback(
    (data) => {
      // -------- CHAT MESSAGE --------
      if (data.type === "chat") {
        const isThisChat =
          (data.from_user_id === myId && data.to_user_id === otherUserId) ||
          (data.from_user_id === otherUserId && data.to_user_id === myId);

        if (!isThisChat) return;

        setMessages((prev) => [
          ...prev,
          {
            id: data.message_id || Date.now(),
            message: data.message,
            self: data.from_user_id === myId,
            from_user: data.from_user,
            created_at: data.created_at || new Date().toISOString()
          }
        ]);
      }

      // -------- TYPING EVENT --------
      if (data.type === "typing" && data.from_user_id === otherUserId) {
        setIsTyping(true);

        clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }

      // -------- PRESENCE --------
      if (data.type === "presence" && data.user_id === otherUserId) {
        setOnlineStatus(data.is_online ? "online" : "offline");
        setLastSeen(data.is_online ? null : data.last_seen);
      }
    },
    [myId, otherUserId]
  );

  // ------------------------------
  // Get / Create Conversation
  // ------------------------------
  useEffect(() => {
    if (!token || !myId || !otherUserId) return;

    const getOrCreateConversation = async () => {
      try {
        const res = await AxiosInstance.post(
          "/chat/conversations/get-or-create/",
          { user_id: otherUserId }
        );

        const convId = res.data.id;

        setConversationId(convId);
        fetchMessages(convId);
      } catch (err) {
        console.error("Conversation API error", err);
      }
    };

    getOrCreateConversation();
    fetchOtherUser();
  }, [token, myId, otherUserId]);

  // ------------------------------
  // WebSocket Connection
  // ------------------------------
  useEffect(() => {
    if (!token || !conversationId) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    wsRef.current = socket;

    addRealtimeListener(handleRealtimeMessage);

    return () => {
      removeRealtimeListener(handleRealtimeMessage);
    };
  }, [conversationId, handleRealtimeMessage]);

  // ------------------------------
  // Send Message
  // ------------------------------
  const sendMessage = () => {
    if (!message.trim()) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected");
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        action: "chat_message",
        message: message,
        to_user: otherUserId
      })
    );

    setMessage("");
  };

  // ------------------------------
  // Handle Typing
  // ------------------------------
  const handleTyping = (value) => {
    setMessage(value);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "typing",
          to_user: otherUserId
        })
      );
    }
  };

  // ------------------------------
  // Sort Messages
  // ------------------------------
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  let lastDate = null;

  return (
    <div className="private-chat-container">
      {/* HEADER */}
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-username">
            {otherUsername || `User ${otherUserId}`}
          </div>

          <div className="chat-status">
            {isTyping
              ? "✍️ typing..."
              : onlineStatus === "online"
              ? "🟢 Online"
              : formatLastSeen(lastSeen)}
          </div>
        </div>

        <CallPanel toUserId={otherUserId} />
      </div>

      {/* MESSAGES */}
      <div className="chat-messages-box">
        {sortedMessages.map((m) => {
          const label = formatDateLabel(m.created_at);
          const showDate = label !== lastDate;
          lastDate = label;

          return (
            <div key={m.id}>
              {showDate && <div className="chat-date-label">{label}</div>}

              <div className={`chat-message-row ${m.self ? "my-msg" : ""}`}>
                <div className="chat-message-body">
                  <span className="chat-username">
                    {m.self ? "You" : m.from_user}
                  </span>

                  <span className="chat-text">{m.message}</span>

                  <span className="chat-time">
                    {formatTime(m.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef}></div>
      </div>

      {/* INPUT */}
      <div className="chat-input-area">
        <input
          className="chat-input"
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Type message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button className="chat-send-btn" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default PrivateChat;