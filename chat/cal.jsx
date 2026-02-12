import { useEffect, useRef, useState } from "react";
import "./CallPanel.css";

const CallPanel = ({ toUserId }) => {

  const socketRef = useRef(null);

  const [status, setStatus] = useState("disconnected");
  // idle | calling | ringing | in_call
  const [callState, setCallState] = useState("idle");

  const [peer, setPeer] = useState(null);

  // ---------------- send helper

  const send = (payload) => {
    if (!socketRef.current) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(JSON.stringify(payload));
  };

  // ---------------- socket connect (once)

  useEffect(() => {

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const ws = new WebSocket(
      `ws://localhost:8000/ws/call/?token=${token}`
    );

    socketRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      console.log("[CALL] socket connected");
    };

    ws.onmessage = (e) => {

      const data = JSON.parse(e.data);
      console.log("[CALL EVENT]", data);

      // ---------------- incoming call
      if (data.action === "call_request") {

        setCallState((prev) => {

          // already busy -> auto reject
          if (prev !== "idle") {
            send({
              action: "call_reject",
              to_user: data.from_user_id
            });
            return prev;
          }

          setPeer({
            id: data.from_user_id,
            name: data.from_user
          });

          return "ringing";
        });
      }

      // ---------------- accepted
      if (data.action === "call_accept") {
        setCallState("in_call");
      }

      // ---------------- rejected
      if (data.action === "call_reject") {
        resetCall();
      }

      // ---------------- ended
      if (data.action === "call_end") {
        resetCall();
      }
    };

    ws.onclose = () => {
      console.log("[CALL] socket closed");
      setStatus("disconnected");
    };

    return () => {
      ws.close();
    };

  }, []);

  // ---------------- helpers

  const resetCall = () => {
    setCallState("idle");
    setPeer(null);
  };

  // ---------------- caller

  const startCall = () => {

    if (!toUserId) {
      alert("Target user missing");
      return;
    }

    setPeer({
      id: toUserId,
      name: "User " + toUserId
    });

    setCallState("calling");

    send({
      action: "call_request",
      to_user: toUserId
    });
  };

  const cutCalling = () => {

    if (!peer) return;

    send({
      action: "call_end",
      to_user: peer.id
    });

    resetCall();
  };

  // ---------------- receiver

  const pickCall = () => {

    if (!peer) return;

    send({
      action: "call_accept",
      to_user: peer.id
    });

    setCallState("in_call");
  };

  const rejectCall = () => {

    if (!peer) return;

    send({
      action: "call_reject",
      to_user: peer.id
    });

    resetCall();
  };

  // ---------------- both

  const cutInCall = () => {

    if (!peer) return;

    send({
      action: "call_end",
      to_user: peer.id
    });

    resetCall();
  };

  return (
    <div className="call-panel">

      <div className="call-header">
        <span>Call Panel</span>
        <span className={`call-status ${status}`}>
          {status}
        </span>
      </div>

      <div className="call-body">

        <div className="call-row">
          <strong>State :</strong> {callState}
        </div>

        {/* IDLE */}
        {callState === "idle" && toUserId && (
          <button
            className="call-btn call-btn-primary"
            onClick={startCall}
          >
            Call
          </button>
        )}

        {/* CALLING */}
        {callState === "calling" && (
          <>
            <div className="call-info">
              Calling {peer?.name} ...
            </div>

            <button
              className="call-btn call-btn-danger"
              onClick={cutCalling}
            >
              Cut
            </button>
          </>
        )}

        {/* RINGING */}
        {callState === "ringing" && (
          <>
            <div className="call-info">
              Incoming call from {peer?.name}
            </div>

            <div className="call-actions">
              <button
                className="call-btn call-btn-primary"
                onClick={pickCall}
              >
                Pick
              </button>

              <button
                className="call-btn call-btn-danger"
                onClick={rejectCall}
              >
                Cut
              </button>
            </div>
          </>
        )}

        {/* IN CALL */}
        {callState === "in_call" && (
          <>
            <div className="call-info">
              In call with {peer?.name}
            </div>

            <button
              className="call-btn call-btn-danger"
              onClick={cutInCall}
            >
              End Call
            </button>
          </>
        )}

      </div>

    </div>
  );
};

export default CallPanel;
