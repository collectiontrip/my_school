// src/contexts/SocketContext.jsx
import { createContext, useContext, useRef } from "react";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const chatSocket = useRef(null);
  const callSocket = useRef(null);

  return (
    <SocketContext.Provider value={{ chatSocket, callSocket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSockets = () => useContext(SocketContext);