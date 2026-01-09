/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QueueItem = {
  nomor: string;
  nama: string;
};

export default function AdminClient() {
  const router = useRouter();

  // ===== STATE WAJIB (URUTAN HOOK AMAN)
  const [konter, setKonter] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lastNumber, setLastNumber] = useState<string>("---");

  // ===== AMBIL KONTER DARI LOCALSTORAGE
  useEffect(() => {
    const savedKonter = localStorage.getItem("konter");

    if (!savedKonter) {
      router.replace("/admin/pilih-konter");
      return;
    }

    setKonter(savedKonter);
    setLoading(false);
  }, [router]);

  // ===== SOCKET
  useEffect(() => {
    if (loading) return;

    fetch("/api/socket");

    socket.on("queue-updated", (data: QueueItem[]) => {
      setQueue(data);
      setLastNumber(data.length ? data[data.length - 1].nomor : "---");
    });

    return () => {
      socket.off("queue-updated");
    };
  }, [loading]);

  // ===== ACTIONS
  const tambahDanCetak = () => {
    socket.emit("add-queue", { nama: "" });

    setTimeout(() => {
      window.print();
    }, 500);
  };

  const panggil = (nomor: string) => {
    socket.emit("call-queue", {
      nomor,
      konter: Number(konter), // 🔥 KONTER DIKIRIM
    });
  };

  // ===== LOADING VIEW (WAJIB)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading Admin...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row overflow-hidden font-sans">

      {/* ===== PANEL KIRI ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
        <img
          src="https://rsarbunda.com/wp-content/uploads/2024/07/head_logo.png"
          className="w-[0%] md:w-[30%]"
        />

        <h3 className="no-print text-[#718096] font-semibold tracking-widest uppercase mb-10 text-xs">
          Nomor Antrian Berikutnya
        </h3>

        <div className="print-area border-[8px] border-[#2DD4BF] w-full max-w-[460px] aspect-square flex flex-col items-center justify-center rounded-[5rem] shadow mb-14 bg-white">
          <div className="text-[120px] font-black text-[#0D9488]">
            {lastNumber}
          </div>
        </div>

        <button
          onClick={tambahDanCetak}
          className="no-print w-full max-w-[420px] py-7 bg-gradient-to-b from-[#0EA5E9] to-[#0284C7] text-white rounded-[2.5rem] shadow active:scale-95 transition-all duration-200 hover:shadow-2xl hover:scale-105"
        >
          🖨️ CETAK & TAMBAH
        </button>

        <button
          onClick={() => socket.emit("reset-queue")}
          className="no-print mt-8 text-xs text-red-400 px-4 py-2 border border-red-400 rounded-lg transition-all duration-200 hover:bg-red-400 hover:text-white"
        >
          Reset Sistem
        </button>
      </div>

      {/* ===== PANEL KANAN ===== */}
      <div className="no-print w-full md:w-[460px] bg-[#F8FAFC] border-l p-10 flex flex-col">
        <div className="mb-6 text-center text-xl font-bold text-yellow-500">
          Konter {konter}
        </div>

        <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-2xl border shadow">
          <h2 className="text-xs font-black tracking-widest uppercase">
            Daftar Antrian
          </h2>
          <span className="bg-[#2DD4BF] text-white px-4 py-1 rounded-xl tracking-wider font-semibold text-s font-black">
            {queue.length} Pasien
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 bor">
          {queue.map((item) => (
            <div
              key={item.nomor}
              className="flex justify-between items-center bg-white rounded-2xl p-6 shadow-lg border border-gray-300"
            >
              <div className="text-4xl font-black text-[#0284C7]">
                {item.nomor}
              </div>
              <button
                onClick={() => panggil(item.nomor)}
                className="px-6 py-3 rounded-xl bg-[#10B981] text-white font-bold text-xs tracking-widest hover:bg-[#059669] active:scale-95 transition-all duration-200"
              >
                📢 PANGGIL
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ===== STRUK PRINT ===== */}
      <div className="print-only fixed top-0 left-0 p-2 text-black font-mono">
        <p className="text-center text-xs">RS AR BUNDA</p>
        <p className="text-center text-4xl font-bold">{lastNumber}</p>
        <p className="text-center text-xs mt-2">
          Konter {konter}
        </p>
      </div>
    </div>
  );
}
