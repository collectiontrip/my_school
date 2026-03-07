import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "./PrivateChat.css";
import CallPanel from "../call/CallPanel";
import AxiosInstance from "../auth/axiosInstance";
import {
  getChatSocket,
  addChatListener,
  removeChatListener
} from "../../socket/socketManager";

const PrivateChat = () => {

  const { userId } = useParams();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);

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

    if (diffDays < 7) {
      return msgDate.toLocaleDateString("en-US", {
        weekday: "long"
      });
    }

    return msgDate.toLocaleDateString();
  };

  // ------------------------------
  // Fetch Messages
  // ------------------------------
  const fetchMessages = async (convId) => {

    try {

      const res = await AxiosInstance.get(
        `/chat/conversations/${convId}/messages/`
      );

      const msgs = res.data;

      const formatted = msgs.map((m) => ({
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
  // Handle Incoming WS Messages
  // ------------------------------
  const handleChatMessage = (event) => {

    const data = JSON.parse(event.data);

    const isThisChat =
      (data.from_user_id === myId && data.to_user_id === otherUserId) ||
      (data.from_user_id === otherUserId && data.to_user_id === myId);

    if (!isThisChat) return;

    setMessages(prev => [
      ...prev,
      {
        id: data.id || Date.now(),
        message: data.message || data.text,
        self: data.from_user_id === myId,
        from_user: data.from_user,
        created_at: data.created_at || new Date().toISOString()
      }
    ]);

  };

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

  }, [token, myId, otherUserId]);

  // ------------------------------
  // WebSocket Connection
  // ------------------------------
  useEffect(() => {

    if (!token || !conversationId) return;

    const socket = getChatSocket();
    if (!socket) return;

    wsRef.current = socket;

    addChatListener(handleChatMessage);

    return () => {
      removeChatListener(handleChatMessage);
    };

  }, [conversationId]);

  // ------------------------------
  // Send Message
  // ------------------------------
  const sendMessage = () => {

    if (!message.trim()) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected");
      return;
    }

    const payload = {
      message,
      to_user: otherUserId,
    };

    wsRef.current.send(JSON.stringify(payload));

    setMessage("");

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

      <CallPanel toUserId={otherUserId} />

      <div className="chat-messages-box">

        {sortedMessages.map((m) => {

          const label = formatDateLabel(m.created_at);
          const showDate = label !== lastDate;
          lastDate = label;

          return (

            <div key={m.id}>

              {showDate && (
                <div className="chat-date-label">
                  {label}
                </div>
              )}

              <div className={`chat-message-row ${m.self ? "my-msg" : ""}`}>

                <div className="chat-message-body">

                  <span className="chat-username">
                    {m.self ? "You" : m.from_user}
                  </span>

                  <span className="chat-text">
                    {m.message}
                  </span>

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

      <div className="chat-input-area">

        <input
          className="chat-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          className="chat-send-btn"
          onClick={sendMessage}
        >
          Send
        </button>

      </div>

    </div>

  );

};

export default PrivateChat;