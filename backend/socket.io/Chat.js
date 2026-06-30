export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} joined room ${roomId}`);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });
  });
}
