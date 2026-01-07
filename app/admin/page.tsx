"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";

type QueueItem = {
  nomor: string;
  nama: string;
};

export default function AdminPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lastNumber, setLastNumber] = useState<string>("---");

  useEffect(() => {
    fetch("/api/socket");

    socket.on("queue-updated", (data: QueueItem[]) => {
      setQueue(data);
      if (data.length > 0) {
        setLastNumber(data[data.length - 1].nomor);
      }
    });

    return () => {
      socket.off("queue-updated");
    };
  }, []);

  const tambahDanCetak = () => {
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
      
      {/* ===== PANEL KIRI: AREA UTAMA (NOMOR BESAR) ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 relative bg-white">
        <div className="no-print absolute top-10 text-[#A0AEC0] font-bold tracking-[0.4em] text-[10px] uppercase">
          RS AR BUNDA PRABUMULIH
        </div>

        <h3 className="no-print text-[#718096] font-semibold tracking-widest uppercase mb-10 text-xs">
          Nomor Antrian Berikutnya
        </h3>
        
        {/* Box Nomor (Border Gradasi Soft) */}
        <div className="print-area border-[8px] border-[#2DD4BF] w-full max-w-[460px] aspect-square flex flex-col items-center justify-center rounded-[5rem] shadow-[0_30px_60px_-15px_rgba(45,212,191,0.3)] mb-14 bg-white transition-all">
          <div className="text-[100px] md:text-[120px] font-black text-[#0D9488] tracking-tighter leading-none">
            {lastNumber}
          </div>
          <div className="h-2.5 w-28 bg-[#99F6E4] rounded-full mt-6" />
        </div>

        {/* Tombol Cetak & Tambah (Blue Glossy) */}
        <button
          onClick={tambahDanCetak}
          className="no-print w-full max-w-[420px] py-7 bg-gradient-to-b from-[#0EA5E9] to-[#0284C7] hover:to-[#0369A1] text-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(14,165,233,0.4)] transition-all active:scale-95 flex flex-col items-center gap-2 border-b-4 border-[#075985]"
        >
          <span className="text-3xl">🖨️</span>
          <span className="text-xl font-black tracking-[0.15em] uppercase">CETAK & TAMBAH</span>
        </button>

        <button 
          onClick={() => socket.emit("reset-queue")}
          className="no-print mt-12 text-[#CBD5E0] hover:text-[#F87171] font-bold text-[10px] tracking-widest uppercase transition-colors"
        >
          Reset Sistem
        </button>
      </div>

      {/* ===== PANEL KANAN: DAFTAR ANTRIAN (Sidebar) ===== */}
      <div className="no-print w-full md:w-[460px] bg-[#F8FAFC] border-l-2 border-[#EDF2F7] p-10 flex flex-col shadow-[inset_10px_0_15px_-10px_rgba(0,0,0,0.02)]">
        
        <div className="flex justify-between items-center mb-12 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F1F5F9]">
          <h2 className="text-[12px] font-black text-[#475569] tracking-[0.2em] uppercase">
            Daftar Antrian
          </h2>
          <span className="bg-[#2DD4BF] text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm">
            {queue.length} Pasien
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-3 custom-scrollbar">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-20 grayscale">
               <span className="text-6xl mb-4">📋</span>
               <p className="text-sm font-bold tracking-widest uppercase">Kosong</p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.nomor}
                className="flex justify-between items-center bg-white rounded-[2rem] p-7 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] border border-transparent hover:border-[#2DD4BF] transition-all group"
              >
                <div className="text-[48px] font-black text-[#0284C7] tracking-tighter group-hover:scale-110 transition-transform">
                  {item.nomor}
                </div>
                <button
                  onClick={() => panggil(item.nomor)}
                  className="px-6 py-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[11px] tracking-[0.2em] transition-all shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] active:scale-90 flex items-center gap-2 uppercase border-b-4 border-[#047857]"
                >
                  📢 Panggil
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-12 text-center text-[10px] text-[#94A3B8] font-bold tracking-[0.5em] uppercase opacity-50">
          Linecaller v1.2
        </div>
      </div>
    </div>
  );
}