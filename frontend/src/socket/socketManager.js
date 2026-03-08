let realtimeSocket = null;

let listeners = new Set();

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

    let data;

    try {
      data = JSON.parse(event.data);
    } catch (err) {
      console.error("Invalid WS message", event.data);
      return;
    }

    listeners.forEach((cb) => cb(data));

  };

  realtimeSocket.onopen = () => {
    console.log("Realtime WebSocket connected");
  };

  realtimeSocket.onclose = () => {
    console.log("Realtime WebSocket disconnected");
  };

  realtimeSocket.onerror = (err) => {
    console.error("Realtime socket error", err);
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