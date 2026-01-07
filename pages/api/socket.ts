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
// KONFIGURASI STORAGE
// =====================
const DATA_PATH = path.join(process.cwd(), "antrian-storage.json");

const getTodayDate = () => new Date().toISOString().split("T")[0];

// Fungsi Membaca Data dari Harddisk
function loadPersistentData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw);

      // CEK: Jika tanggal di file = hari ini, ambil datanya.
      // Jika beda (sudah ganti hari), return data kosong (reset).
      if (parsed.date === getTodayDate()) {
        return {
          queue: parsed.queue || [],
          counter: parsed.counter || 1
        };
      }
    }
  } catch (e) {
    console.error("Gagal membaca file storage:", e);
  }
  // Default jika file tidak ada atau sudah ganti hari
  return { queue: [], counter: 1 };
}

// Fungsi Menyimpan Data ke Harddisk
function savePersistentData(queue: any[], counter: number) {
  try {
    const dataToSave = {
      date: getTodayDate(),
      queue,
      counter
    };
    fs.writeFileSync(DATA_PATH, JSON.stringify(dataToSave, null, 2));
  } catch (e) {
    console.error("Gagal menyimpan file storage:", e);
  }
}

// =====================
// STATE SERVER (DIAMBIL DARI STORAGE)
// =====================
let { queue, counter } = loadPersistentData();

function generateNumber() {
  return `A-${String(counter++).padStart(3, "0")}`;
}

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
      console.log("🟢 Client connected");

      // Kirim list awal yang tersimpan di harddisk
      socket.emit("queue-updated", queue);

      // TAMBAH ANTRIAN
      socket.on("add-queue", ({ nama }) => {
        const nomor = generateNumber();
        const item = { nomor, nama };

        queue.push(item);
        
        // Simpan setiap kali ada perubahan
        savePersistentData(queue, counter);
        
        io.emit("queue-updated", queue);
        console.log("➕ Antrian Disimpan:", item);
      });

      // PANGGIL ANTRIAN
      socket.on("call-queue", ({ nomor }) => {
        const index = queue.findIndex((q: { nomor: any; }) => q.nomor === nomor);
        if (index === -1) return;

        const called = queue[index];
        queue.splice(index, 1);

        // Simpan perubahan setelah dipanggil (dihapus dari list)
        savePersistentData(queue, counter);

        io.emit("patient-called", called);
        io.emit("queue-updated", queue);

        console.log("📣 Dipanggil:", called);
      });

      // (Opsional) Reset Manual
      socket.on("reset-queue", () => {
        queue = [];
        counter = 1;
        savePersistentData(queue, counter);
        io.emit("queue-updated", queue);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}