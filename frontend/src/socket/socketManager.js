let realtimeSocket = null;

let listeners = new Set();


// ---------------- REALTIME SOCKET ----------------

export const getRealtimeSocket = () => {

  if (
    realtimeSocket &&
    (
      realtimeSocket.readyState === WebSocket.OPEN ||
      realtimeSocket.readyState === WebSocket.CONNECTING
    )
  ) {
    console.log("Using existing REALTIME WebSocket");
    return realtimeSocket;
  }

  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  const wsUrl = `wss://${window.location.hostname}:8000/ws/realtime/?token=${token}`;
  console.log("Creating REALTIME WebSocket:", wsUrl);

  realtimeSocket = new WebSocket(wsUrl);

  realtimeSocket.onmessage = (event) => {

    listeners.forEach((cb) => cb(event));

  };

  realtimeSocket.onopen = () => {
    console.log("Realtime WebSocket connected");
  };

  realtimeSocket.onclose = () => {
    console.log("Realtime WebSocket disconnected");
  };

  return realtimeSocket;
};


// ---------------- LISTENERS ----------------

export const addRealtimeListener = (cb) => {
  listeners.add(cb);
};

export const removeRealtimeListener = (cb) => {
  listeners.delete(cb);
};