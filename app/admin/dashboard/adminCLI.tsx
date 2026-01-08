/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";

type QueueItem = {
  nomor: string;
  nama: string;
};

export default function AdminPage() {
  // ===== AMBIL KONTER TANPA useSearchParams (AMAN BUILD & EXE)
  const konter =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("konter") || "1"
      : "1";

  const isKonter1 = konter === "1";

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lastNumber, setLastNumber] = useState<string>("---");

  useEffect(() => {
    fetch("/api/socket");

    // minta data awal
    socket.emit("get-queue");

    socket.on("queue-updated", (data: QueueItem[]) => {
      setQueue(data);
      if (data.length > 0) {
        setLastNumber(data[data.length - 1].nomor);
      } else {
        setLastNumber("---");
      }
    });

    return () => {
      socket.off("queue-updated");
    };
  }, []);

  const tambahDanCetak = () => {
    if (!isKonter1) return;
    socket.emit("add-queue", { nama: "" });

    setTimeout(() => {
      window.print();
    }, 500);
  };

  const panggil = (nomor: string) => {
    socket.emit("call-queue", { nomor });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row overflow-hidden font-sans">

      {/* ===== PANEL KIRI ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 relative bg-white">
        <img
          src="https://rsarbunda.com/wp-content/uploads/2024/07/head_logo.png"
          className="w-[0%] md:w-[30%]"
        />

        <h3 className="no-print text-[#718096] font-semibold tracking-widest uppercase mb-10 text-xs">
          Nomor Antrian Berikutnya
        </h3>

        <div className="print-area border-[8px] border-[#2DD4BF] w-full max-w-[460px] aspect-square flex flex-col items-center justify-center rounded-[5rem] shadow-[0_30px_60px_-15px_rgba(45,212,191,0.3)] mb-14 bg-white">
          <div className="text-[100px] md:text-[120px] font-black text-[#0D9488]">
            {lastNumber}
          </div>
          <div className="h-2.5 w-28 bg-[#99F6E4] rounded-full mt-6" />
        </div>

        {isKonter1 && (
          <button
            onClick={tambahDanCetak}
            className="no-print w-full max-w-[420px] py-7 bg-gradient-to-b from-[#0EA5E9] to-[#0284C7] hover:to-[#0369A1] text-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(14,165,233,0.4)] transition-all active:scale-95 flex flex-col items-center gap-2 border-b-4 border-[#075985]"
          >
            <span className="text-3xl">🖨️</span>
            <span className="text-xl font-black tracking-[0.15em] uppercase">
              CETAK & TAMBAH
            </span>
          </button>
        )}

        {isKonter1 && (
          <button
            onClick={() => socket.emit("reset-queue")}
            className="no-print mt-12 text-[#CBD5E0] hover:text-[#F87171] font-bold text-[10px] tracking-widest uppercase"
          >
            Reset Sistem
          </button>
        )}
      </div>

      {/* ===== PANEL KANAN ===== */}
      <div className="no-print w-full md:w-[460px] bg-[#F8FAFC] border-l-2 border-[#EDF2F7] p-10 flex flex-col">
        <div className="mb-6 mt-3 text-center text-[25px] text-yellow-500 font-bold uppercase">
          Konter {konter}
        </div>

        <div className="flex justify-between items-center mb-12 bg-white p-6 rounded-[2rem] shadow border">
          <h2 className="text-[12px] font-black tracking-[0.2em] uppercase">
            Daftar Antrian
          </h2>
          <span className="bg-[#2DD4BF] text-white px-4 py-1.5 rounded-xl text-[12px] font-black uppercase">
            {queue.length} Pasien
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-3">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-20">
              <span className="text-6xl mb-4">📋</span>
              <p className="text-sm font-bold tracking-widest uppercase">
                Kosong
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.nomor}
                className="flex justify-between items-center bg-white rounded-[2rem] p-7 shadow"
              >
                <div className="text-[48px] font-black text-[#0284C7]">
                  {item.nomor}
                </div>
                <button
                  onClick={() => panggil(item.nomor)}
                  className="px-6 py-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[11px] tracking-[0.2em] uppercase"
                >
                  📢 Panggil
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== STRUK PRINT ===== */}
      <div className="print-only fixed top-0 left-0 font-mono text-black p-2">
        <div className="text-center mb-2">
          <img
            src="https://rsarbunda.com/wp-content/uploads/2024/07/head_logo.png"
            className="w-full mb-1"
          />
          <p className="text-[10px] font-bold">RS AR BUNDA</p>
          <p className="text-[9px]">Sistem Antrian</p>
        </div>

        <div className="border-t border-dashed my-2" />

        <p className="text-center text-[10px]">Nomor Antrian</p>
        <p className="text-center text-[36px] font-bold">
          {lastNumber}
        </p>

        <div className="border-t border-dashed my-2" />

        <p className="text-[9px]">
          {new Date().toLocaleDateString()} <br />
          {new Date().toLocaleTimeString()}
        </p>

        <div className="border-t border-dashed my-2" />

        <p className="text-center text-[9px]">
          Harap menunggu nomor Anda dipanggil
        </p>

        <p className="mt-2 text-center text-[8px]">
          Terima kasih 🙏
        </p>
      </div>
    </div>
  );
}
