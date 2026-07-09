import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export const connectSocket = (token) => {
  if (!token) {
    socket.disconnect();
    return socket;
  }

  if (socket.connected && socket.auth?.token === token) {
    return socket;
  }

  if (socket.connected || socket.connecting) {
    socket.disconnect();
  }

  socket.auth = { token };
  socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected || socket.connecting) {
    socket.disconnect();
  }

  return socket;
};

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error.message);
});

export default socket;
