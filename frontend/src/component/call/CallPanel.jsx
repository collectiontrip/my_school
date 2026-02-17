import { useEffect, useRef, useState } from "react";
import "./CallPanel.css";

const CallPanel = ({ toUserId }) => {

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [status, setStatus] = useState("disconnected");
  const [callState, setCallState] = useState("idle"); // idle | calling | ringing | in_call
  const [peer, setPeer] = useState(null);

  const send = (payload) => {
    if (!socketRef.current) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify(payload));
  };

  // ----------------------------------------------------
  // get / reuse local media
  // ----------------------------------------------------
  const getLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  // ----------------------------------------------------
  // create peer only once
  // ----------------------------------------------------
  const createPeer = async (targetUserId) => {

    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });

    pcRef.current = pc;

    const stream = await getLocalStream();

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log("Remote track received");

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          action: "webrtc_ice",
          to_user: targetUserId,
          data: event.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
    };

    return pc;
  };

  // ----------------------------------------------------
  // websocket
  // ----------------------------------------------------
  useEffect(() => {

    const token = localStorage.getItem("accessToken");
    const myUserId = Number(localStorage.getItem("user_id"));

    if (!token) return;

    const ws = new WebSocket(
      `wss://${window.location.hostname}:8000/ws/call/?token=${token}`
    );

    socketRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      console.log("[CALL] socket connected");
    };

    ws.onmessage = async (e) => {

      const data = JSON.parse(e.data);

      // ✅ very important filter
      if (data.to_user_id && data.to_user_id !== myUserId) {
        return;
      }

      console.log("[CALL EVENT]", data);

      // ---------------- incoming call ----------------
      if (data.action === "call_request") {

        setCallState(prev => {

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

      // ---------------- caller side ----------------
      if (data.action === "call_accept") {

        setCallState("in_call");

        const pc = await createPeer(data.from_user_id);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        send({
          action: "webrtc_offer",
          to_user: data.from_user_id,
          data: offer
        });
      }

      // ---------------- receiver side ----------------
      if (data.action === "webrtc_offer") {

        setPeer(p => p || {
          id: data.from_user_id,
          name: data.from_user
        });

        const pc = await createPeer(data.from_user_id);

        await pc.setRemoteDescription(
          new RTCSessionDescription(data.data)
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        send({
          action: "webrtc_answer",
          to_user: data.from_user_id,
          data: answer
        });

        setCallState("in_call");
      }

      // ---------------- caller side ----------------
      if (data.action === "webrtc_answer") {

        if (!pcRef.current) return;

        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(data.data)
        );
      }

      // ---------------- both sides ----------------
      if (data.action === "webrtc_ice") {

        if (!pcRef.current || !data.data) return;

        try {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(data.data)
          );
        } catch (err) {
          console.error("ICE error", err);
        }
      }

      if (data.action === "call_reject") {
        resetCall();
      }

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

  // ----------------------------------------------------
  // helpers
  // ----------------------------------------------------
  const resetCall = () => {

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current)
      localVideoRef.current.srcObject = null;

    if (remoteVideoRef.current)
      remoteVideoRef.current.srcObject = null;

    setCallState("idle");
    setPeer(null);
  };

  const startCall = () => {

    if (!toUserId) return;

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

  const pickCall = () => {

    if (!peer) return;

    send({
      action: "call_accept",
      to_user: peer.id
    });
  };

  const rejectCall = () => {

    if (!peer) return;

    send({
      action: "call_reject",
      to_user: peer.id
    });

    resetCall();
  };

  const cutInCall = () => {

    if (!peer) return;

    send({
      action: "call_end",
      to_user: peer.id
    });

    resetCall();
  };

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
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

        <div className="call-video-wrap">
          <video ref={localVideoRef} autoPlay muted playsInline />
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>

        {callState === "idle" && toUserId && (
          <button
            className="call-btn call-btn-primary"
            onClick={startCall}
          >
            Call
          </button>
        )}

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