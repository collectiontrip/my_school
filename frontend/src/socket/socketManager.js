let callSocket = null;
let chatSocket = null;

let callListeners = [];
let chatListeners = [];

// ---------------- CALL SOCKET ----------------

export const getCallSocket = () => {

  if (
    callSocket &&
    (
      callSocket.readyState === WebSocket.OPEN ||
      callSocket.readyState === WebSocket.CONNECTING
    )
  ) {
    console.log("Using existing CALL WebSocket");
    return callSocket;
  }

  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  const wsUrl = `wss://${window.location.hostname}:8000/ws/call/?token=${token}`;
  console.log("Creating CALL WebSocket:", wsUrl);

  callSocket = new WebSocket(wsUrl);

  callSocket.onmessage = (event) => {
    callListeners.forEach(cb => cb(event));
  };

  return callSocket;
};

export const addCallListener = (cb) => {
  callListeners.push(cb);
};

export const removeCallListener = (cb) => {
  callListeners = callListeners.filter(fn => fn !== cb);
};


// ---------------- CHAT SOCKET ----------------

export const getChatSocket = () => {

  if (
    chatSocket &&
    (
      chatSocket.readyState === WebSocket.OPEN ||
      chatSocket.readyState === WebSocket.CONNECTING
    )
  ) {
    console.log("Using existing CHAT WebSocket");
    return chatSocket;
  }

  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  const wsUrl = `wss://${window.location.hostname}:8000/ws/chat/?token=${token}`;
  console.log("Creating CHAT WebSocket:", wsUrl);

  chatSocket = new WebSocket(wsUrl);

  chatSocket.onmessage = (event) => {
    chatListeners.forEach(cb => cb(event));
  };

  return chatSocket;
};

export const addChatListener = (cb) => {
  chatListeners.push(cb);
};

export const removeChatListener = (cb) => {
  chatListeners = chatListeners.filter(fn => fn !== cb);
};