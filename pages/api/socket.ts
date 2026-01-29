/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */

import { Server as IOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket } from "net";
import fs from "fs";
import path from "path";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
};

// =====================
// 🔥 STORAGE PATH AMAN (.exe & dev)
// =====================
function getStoragePath() {
  // jalan di Electron (.exe)
  if (process.versions.electron) {
    const { app } = require("electron");
    return path.join(app.getPath("userData"), "antrian-storage.json");
  }

  // jalan di dev / browser
  return path.join(process.cwd(), "antrian-storage.json");
}

const DATA_PATH = getStoragePath();
const getTodayDate = () => new Date().toISOString().split("T")[0];

// =====================
// PERSISTENT STORAGE
// =====================
function loadPersistentData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw);

      if (parsed.date === getTodayDate()) {
        return {
          queue: parsed.queue || [],
          counter: parsed.counter || 1,
        };
      }
    }
  } catch (e) {
    console.error("❌ Gagal membaca storage:", e);
  }

  return { queue: [], counter: 1 };
}

function savePersistentData(queue: any[], counter: number) {
  try {
    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify(
        {
          date: getTodayDate(),
          queue,
          counter,
        },
        null,
        2
      )
    );
  } catch (e) {
    console.error("❌ Gagal menyimpan storage:", e);
  }
}

// =====================
// STATE SERVER
// =====================
let { queue, counter } = loadPersistentData();
let calledPatients: { [nomor: string]: { konter: number; timestamp: number } } = {}; // Track called patients

function generateNumber() {
  return `A-${String(counter++).padStart(3, "0")}`;
}
// =====================
// SOCKET HANDLER
// =====================
export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log("🛠️ Initializing Socket.io...");

    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
    });

    io.on("connection", (socket) => {
      console.log("🟢 Client connected", { socketId: socket.id });

      // kirim data awal
      socket.emit("queue-updated", queue);

      // 🔥 WAJIB UNTUK ADMIN / EXE
      socket.on("get-queue", () => {
        console.log("📋 get-queue requested");
        socket.emit("queue-updated", queue);
      });

      // tambah antrian
      socket.on("add-queue", () => {
        console.log("➕ add-queue received");
        const nomor = generateNumber();
        const item = { nomor};

        queue.push(item);
        savePersistentData(queue, counter);

        console.log(`📢 Emitting queue-updated with ${queue.length} items`);
        io.emit("queue-updated", queue);
      });

      // panggil antrian
      socket.on("call-queue", ({ nomor, konter }) => {
        console.log(`📞 call-queue received: nomor=${nomor}, konter=${konter}`);
        const index = queue.findIndex(
          (q: { nomor: string }) => q.nomor === nomor
        );
        if (index === -1) {
          console.log(`❌ Nomor tidak ditemukan di queue: ${nomor}`);
          return;
        }

        const called = {
          ...queue[index],
          konter,
        };

        // Simpan ke calledPatients untuk recall-queue
        calledPatients[nomor] = { konter, timestamp: Date.now() };
        
        queue.splice(index, 1);
        savePersistentData(queue, counter);

        console.log(`📢 Emitting patient-called:`, called);
        io.emit("patient-called", called);
        io.emit("queue-updated", queue);
      });

      // panggil ulang antrian (cari dari calledPatients)
      socket.on("recall-queue", ({ nomor, konter }) => {
        console.log(`🔄 recall-queue received: nomor=${nomor}, konter=${konter}`);
        
        // Cari dari calledPatients (nomor yang sudah dipanggil sebelumnya)
        if (!calledPatients[nomor]) {
          console.log(`❌ Nomor tidak ada di called patients: ${nomor}`);
          return;
        }

        const called = {
          nomor,
          konter,
          isRecall: true,
        };

        console.log(`📢 Emitting patient-called (recall):`, called);
        io.emit("patient-called", called);
      });

      // reset
      socket.on("reset-queue", () => {
        console.log("🔄 reset-queue received");
        queue = [];
        counter = 1;
        calledPatients = {}; // Clear called patients
        savePersistentData(queue, counter);
        io.emit("queue-updated", queue);
      });

      socket.on("disconnect", (reason) => {
        console.log(`🔌 Client disconnected: ${reason}`);
      });

      socket.on("error", (error) => {
        console.error("❌ Socket error:", error);
      });
    });

    res.socket.server.io = io;
  }

    res.status(200).json({ success: true, message: "Socket server ready" });
}
