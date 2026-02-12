const CameraAccess = ({ stream, setStream}) => {
    const toggleCamera = async () => {
        if (!stream) {
            const mediaStream =  await navigator.mediaDevices.getUserMedia({ video: true, audio: true});
            setStream(mediaStream);
        } else {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    return (
        <button onClick={toggleCamera}>
            {stream ? "CameraOFF" : "Camera ON"}
        </button>
    );
};

export default CameraAccess;