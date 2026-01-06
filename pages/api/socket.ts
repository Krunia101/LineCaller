/* eslint-disable prefer-const */
import { Server as IOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket } from "net";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
};

// =====================
// STATE SERVER (GLOBAL)
// =====================
let queue: { nomor: string; nama: string }[] = [];
let counter = 1;

function generateNumber() {
  return `A-${String(counter++).padStart(3, "0")}`;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
    });

    io.on("connection", (socket) => {
      console.log("🟢 Client connected");

      // Kirim list awal ke admin
      socket.emit("queue-updated", queue);

      // =====================
      // TAMBAH ANTRIAN
      // =====================
      socket.on("add-queue", ({ nama }) => {
        const nomor = generateNumber();
        const item = { nomor, nama };

        queue.push(item);
        io.emit("queue-updated", queue);

        console.log("➕ Antrian:", item);
      });

      // =====================
      // PANGGIL ANTRIAN
      // =====================
      socket.on("call-queue", ({ nomor }) => {
        const index = queue.findIndex((q) => q.nomor === nomor);
        if (index === -1) return;

        const called = queue[index];
        queue.splice(index, 1);

        io.emit("patient-called", called);
        io.emit("queue-updated", queue);

        console.log("📣 Dipanggil:", called);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
