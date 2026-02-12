import { useRef, useState, useEffect } from "react";

const MicAccess = () => {
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const timerRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioURL, setAudioURL] = useState(null);

  
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  
  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  
  const startRecording = async () => {
    try {
      setAudioURL(null);
      setSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setPaused(false);
      startTimer();
    } catch (err) {
      console.log("Mic permission denied", err);
    }
  };

  
  const pauseRecording = () => {
    recorderRef.current.pause();
    setPaused(true);
    stopTimer();
  };

  
  const resumeRecording = () => {
    recorderRef.current.resume();
    setPaused(false);
    startTimer();
  };

 
  const stopRecording = () => {
    recorderRef.current.stop();
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    stopTimer();
    setRecording(false);
    setPaused(false);
  };

  
  const formatTime = time => {
    const m = String(Math.floor(time / 60)).padStart(2, "0");
    const s = String(time % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div style={{ textAlign: "center" }}>
      {!recording && (
        <button onClick={startRecording}>🎤 Start Recording</button>
      )}

      {recording && (
        <>
          <h4>⏱ {formatTime(seconds)}</h4>

          {!paused ? (
            <button onClick={pauseRecording}>⏸ Pause</button>
          ) : (
            <button onClick={resumeRecording}>▶️ Resume</button>
          )}

          <br /><br />
          <button onClick={stopRecording}>⏹ Stop</button>
        </>
      )}

      {audioURL && !recording && (
        <>
          <br /><br />
          <audio controls src={audioURL} />
        </>
      )}
    </div>
  );
};

export default MicAccess;































































































































































