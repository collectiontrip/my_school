import { useState } from "react";
import CameraAccess from "./Camera/CameraAccess";
import Picture from "./Camera/Picture";
import VideoRecorder from "./Camera/VideoRecorder";
import MicAccess from "./Mic/MicAccess";

const Media = () => {
  const [stream, setStream] = useState(null);

  return (
    <div style={{ textAlign: "center" }}>
      
      {/* 🔘 Camera + Mic buttons (horizontal) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <CameraAccess stream={stream} setStream={setStream} />
        <MicAccess />
      </div>

      {/* 📸 Picture + 🎥 Video only when camera is ON */}
      {stream && (
        <>
          <Picture stream={stream} />
          <VideoRecorder stream={stream} />
        </>
      )}
    </div>
  );
};

export default Media;
