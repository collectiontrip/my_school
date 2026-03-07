let socket = null;

export const getSocket = () => {

  if(
    socket &&
    (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )
  ) {
    console.log("Using existing WebSocket");
    return socket;
  }

  const token = localStorage.getItem("accessToken");

  if (!token) {
    console.log("No token found. WebSocket not created.");
    return null;
  }

  const wsUrl = `wss://${window.location.hostname}:8000/ws/call/?token=${token}`;
  console.log("Creating new WebSocket connection:", wsUrl);

  socket = new WebSocket(wsUrl);
  return socket;
};