"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";

type Patient = {
  nama: string;
  nomor: number;
};

export default function DisplayPage() {
  const [data, setData] = useState<Patient | null>(null);

  // Fungsi untuk memanggil API TTS agar suara tidak kaku
  const playVoice = async (text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Gagal mengambil suara");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      await audio.play();
      
      // Hapus URL dari memori setelah selesai diputar
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  useEffect(() => {
    // bangunin socket server
    fetch("/api/socket");

    socket.on("patient-called", (payload: Patient) => {
      console.log("DISPLAY TERIMA:", payload);

      setData(payload);

      // Gunakan jeda titik (.) agar intonasi suara lebih manusiawi
      const teksPanggilan = `Nomor antrian. ${payload.nomor}. Silakan ke konter pelayanan.`;
      
      playVoice(teksPanggilan);
    });

    return () => {
      socket.off("patient-called");
    };
  }, []);

  // --- UI ASLI KAMU ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-100 flex items-center justify-center px-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-teal-200 p-10 text-center">
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-teal-700 tracking-wide mb-10">
          ANTRIAN SAAT INI
        </h1>

        {data ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-[120px] md:text-[160px] font-black text-sky-600 leading-none drop-shadow">
              {data.nomor}
            </div>

            <div className="text-3xl md:text-4xl font-semibold text-gray-700 uppercase">
              {data.nama}
            </div>

            <div className="mt-4 text-lg text-gray-500">
              Silakan menuju konter pelayanan
            </div>
          </div>
        ) : (
          <div className="text-2xl md:text-3xl font-medium text-gray-400 animate-pulse">
            Menunggu panggilan...
          </div>
        )}

        <div className="mt-12 border-t pt-6 text-sm text-gray-400">
          RS AR BUNDA Prabumulih
        </div>
      </div>
    </div>
  );
}