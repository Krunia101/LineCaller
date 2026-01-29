import { io } from "socket.io-client";

export const socket = io({
  path: "/api/socket",
});

// Debug logging
if (typeof window !== "undefined") {
  socket.on("connect", () => {
    console.log(`✅ Socket connected: ${socket.id}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket disconnected: ${reason}`);
  });

  socket.on("connect_error", (error) => {
    console.error(`❌ Socket connect error:`, error);
  });
}
