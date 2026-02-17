import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "./PrivateChat.css";
import CallPanel from "../call/CallPanel";

const PrivateChat = () => {
  const { userId } = useParams(); // receiver id

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const wsRef = useRef(null);

  const myId = Number(localStorage.getItem("user_id"));
  const token = localStorage.getItem("accessToken");
  const otherUserId = Number(userId);

  useEffect(() => {
    if (!token || !myId || !otherUserId) return;

    const socket = new WebSocket(
      `wss://${window.location.hostname}:8000/ws/chat/?token=${token}`
    );

    wsRef.current = socket;

    socket.onopen = () => {
      console.log("Chat WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      const isThisChat =
        (data.from_user_id === myId && data.to_user_id === otherUserId) ||
        (data.from_user_id === otherUserId && data.to_user_id === myId);

      if (!isThisChat) return;

      setMessages((prev) => [
        ...prev,
        {
          ...data,
          self: data.from_user_id === myId
        }
      ]);
    };

    socket.onerror = (e) => {
      console.log("Chat socket error", e);
    };

    socket.onclose = () => {
      console.log("Chat WebSocket closed");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };

  }, [otherUserId, myId, token]);

  const sendMessage = () => {
    if (!message.trim() || !wsRef.current) return;

    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        message,
        to_user: otherUserId
      })
    );

    setMessage("");
  };

  return (
    <div className="private-chat-container">

      <CallPanel toUserId={otherUserId} />



      <div className="chat-messages-box">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-message-row ${m.self ? "my-msg" : ""}`}
          >
            <span className="chat-username">
              {m.self ? "You" : m.from_user}
            </span>
            <span className="chat-text">{m.message}</span>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
