import { useEffect, useRef, useState } from "react";


const Picture = ({ stream }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [photo, setPhoto] = useState(null);

    useEffect(() => {
        if(videoRef.current && stream && !photo) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play();
            };
        }
    }, [stream, photo])

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        setPhoto(canvas.toDataURL("image/png"));
    };

    const retakePhoto = () => {
        setPhoto(null);
    };

    return (
        <div>
            {!photo ? (
                <video ref={videoRef} autoPlay muted playsInline width= "300" />
            ) : (
                <img src={photo} width="300" alt="captured" />   
             )}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!photo ? (
                <button onClick={capturePhoto}>📷 Capture</button>
            ) : (
                <button onClick={retakePhoto}>🔄 Retake</button>
            )}

        </div>

        
    );
};

export default Picture;