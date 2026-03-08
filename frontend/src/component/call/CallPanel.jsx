import { useEffect, useRef, useState, useCallback } from "react";
import "./CallPanel.css";

import {
  getRealtimeSocket,
  addRealtimeListener,
  removeRealtimeListener
} from "../../socket/socketManager";

const CallPanel = ({ toUserId }) => {

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [status, setStatus] = useState("disconnected");
  const [callState, setCallState] = useState("idle");
  const [peer, setPeer] = useState(null);

  const [swapVideo, setSwapVideo] = useState(false);

  const myUserId = Number(localStorage.getItem("user_id"));

  // ----------------------------------------------------
  // safe send
  // ----------------------------------------------------
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
  // create peer connection
  // ----------------------------------------------------
  const createPeer = async (targetUserId) => {

    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pcRef.current = pc;

    const stream = await getLocalStream();

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }

    };

    pc.onicecandidate = (event) => {

      if (!event.candidate) return;

      send({
        action: "webrtc_ice",
        to_user: targetUserId,
        data: event.candidate
      });

    };

    return pc;

  };

  // ----------------------------------------------------
  // reset call
  // ----------------------------------------------------
  const resetCall = () => {

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallState("idle");
    setPeer(null);

  };

  // ----------------------------------------------------
  // realtime events
  // ----------------------------------------------------
  const callHandler = useCallback(async (data) => {

    if (data.type !== "call") return;

    if (data.to_user_id && data.to_user_id !== myUserId) return;

    if (data.action === "call_request") {

      setPeer({
        id: data.from_user_id,
        name: data.from_user
      });

      setCallState("ringing");

    }

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

    if (data.action === "webrtc_offer") {

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

    if (data.action === "webrtc_answer") {

      if (!pcRef.current) return;

      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(data.data)
      );

    }

    if (data.action === "webrtc_ice") {

      if (!pcRef.current) return;

      await pcRef.current.addIceCandidate(
        new RTCIceCandidate(data.data)
      );

    }

    if (data.action === "call_reject") resetCall();
    if (data.action === "call_end") resetCall();

  }, [myUserId]);

  useEffect(() => {

    const ws = getRealtimeSocket();

    if (!ws) return;

    socketRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");

    addRealtimeListener(callHandler);

    return () => removeRealtimeListener(callHandler);

  }, [callHandler]);

  // ----------------------------------------------------
  // UI actions
  // ----------------------------------------------------

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

  const endCall = () => {

    if (!peer) return;

    send({
      action: "call_end",
      to_user: peer.id
    });

    resetCall();

  };

  const pickCall = () => {

    send({
      action: "call_accept",
      to_user: peer.id
    });

  };

  const rejectCall = () => {

    send({
      action: "call_reject",
      to_user: peer.id
    });

    resetCall();

  };

  return (

    <div className="call-panel">

      <div className="call-header">
        <span>Video Call</span>
        <span className={`call-status ${status}`}>
          {status}
        </span>
      </div>

      <div className="call-video-wrap">

        <video
          ref={remoteVideoRef}
          className={swapVideo ? "local-video" : "remote-video"}
          autoPlay
          playsInline
        />

        <video
          ref={localVideoRef}
          className={swapVideo ? "remote-video" : "local-video"}
          autoPlay
          muted
          playsInline
        />

        <button
          className="video-toggle"
          onClick={() => setSwapVideo(prev => !prev)}
        >
          Swap
        </button>

      </div>

      <div className="call-body">

        {callState === "idle" && toUserId && (
          <button className="call-btn call-btn-primary" onClick={startCall}>
            Start Call
          </button>
        )}

        {callState === "calling" && (
          <>
            <div className="call-info">
              Calling {peer?.name}...
            </div>

            <button className="call-btn call-btn-danger" onClick={endCall}>
              Cancel
            </button>
          </>
        )}

        {callState === "ringing" && (
          <>
            <div className="call-info">
              Incoming call from {peer?.name}
            </div>

            <div className="call-actions">

              <button className="call-btn call-btn-primary" onClick={pickCall}>
                Accept
              </button>

              <button className="call-btn call-btn-danger" onClick={rejectCall}>
                Reject
              </button>

            </div>
          </>
        )}

        {callState === "in_call" && (
          <>
            <div className="call-info">
              In call with {peer?.name}
            </div>

            <button className="call-btn call-btn-danger" onClick={endCall}>
              End Call
            </button>
          </>
        )}

      </div>

    </div>

  );

};

export default CallPanel;