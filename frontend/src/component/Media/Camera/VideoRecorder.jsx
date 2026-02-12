import { useRef, useEffect, useState } from "react";

const VideoRecorder = ({ stream }) => {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]); // ✅ array

  const [recording, setRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);

  const toggleRecording = () => {
    if (!stream) return;

    
    if (!recording) {
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
      };

      recorder.start();
      setRecording(true);
    }
  
    else {
      recorderRef.current.stop();
      setRecording(false);
    }
  };

  
  useEffect(() => {
    if (!stream) {
      setRecording(false);
      setVideoURL(null);
    }
  }, [stream]);

  return (
    <div style={{ marginTop: "10px" }}>
      <button onClick={toggleRecording} disabled={!stream}>
        {recording ? "⏹ Stop Recording" : "🎥 Start Recording"}
      </button>

      {videoURL && (
        <div style={{ marginTop: "10px" }}>
          <h4>Recorded video:</h4>
          <video src={videoURL} controls width="300" />
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
