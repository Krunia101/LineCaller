"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";

type QueueItem = {
  nomor: string;
  nama: string;
};

export default function AdminPage() {
  const [nama, setNama] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    fetch("/api/socket");

    socket.on("queue-updated", (data: QueueItem[]) => {
      setQueue(data);
    });

    return () => {
      socket.off("queue-updated");
    };
  }, []);

  const tambahAntrian = () => {
    if (!nama.trim()) return;
    socket.emit("add-queue", { nama });
    setNama("");
  };

  const panggil = (nomor: string) => {
    socket.emit("call-queue", { nomor });
  };

return (
  <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-100 text-slate-800">
    {/* ===== KIRI : FORM ===== */}
    <div className="flex flex-col justify-center px-10 py-12 bg-white border-r">
      <h2 className="text-3xl font-bold text-teal-700 mb-2">
        ➕ Tambah Antrian
      </h2>
      <p className="text-slate-500 mb-8">
        Masukkan nama pasien untuk antrian
      </p>

      <input
        placeholder="Nama Pasien"
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        className="mb-4 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400 text-lg"
      />

      <button
        onClick={tambahAntrian}
        disabled={!nama.trim()}
        className={`py-3 rounded-xl text-white font-bold text-lg transition
          ${
            nama.trim()
              ? "bg-sky-600 hover:bg-sky-700"
              : "bg-slate-300 cursor-not-allowed"
          }`}
      >
        TAMBAH ANTRIAN
      </button>

      <div className="mt-10 text-sm text-slate-400">
        Sistem Antrian RS AR BUNDA Prabumulih
      </div>
    </div>

    {/* ===== KANAN : LIST ===== */}
    <div className="px-10 py-12 overflow-y-auto">
      <h2 className="text-3xl font-bold text-sky-700 mb-6">
        📋 Antrian Aktif
      </h2>

      {queue.length === 0 && (
        <p className="text-slate-500 text-lg">
          Belum ada antrian
        </p>
      )}

      <div className="space-y-4">
        {queue.map((item) => (
          <div
            key={item.nomor}
            className="flex justify-between items-center bg-white rounded-2xl p-5 shadow-md"
          >
            <div>
              <div className="text-2xl font-extrabold text-sky-600">
                {item.nomor}
              </div>
              <div className="text-slate-600">
                {item.nama}
              </div>
            </div>

            <button
              onClick={() => panggil(item.nomor)}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition"
            >
              PANGGIL
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

}
