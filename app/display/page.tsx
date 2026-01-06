"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";

type Patient = {
  nama: string;
  nomor: number;
};

export default function DisplayPage() {
  const [data, setData] = useState<Patient | null>(null);

  useEffect(() => {
    // bangunin socket server
    fetch("/api/socket");

    socket.on("patient-called", (payload: Patient) => {
      console.log("DISPLAY TERIMA:", payload);

      setData(payload);

      const msg = new SpeechSynthesisUtterance(
        `Nomor antrian ${payload.nomor}, atas nama ${payload.nama}, silakan ke konter`
      );
      msg.lang = "id-ID";
      msg.rate = 0.95;

      speechSynthesis.cancel();
      speechSynthesis.speak(msg);
    });

    return () => {
      socket.off("patient-called");
    };
  }, []);

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

          <div className="text-3xl md:text-4xl font-semibold text-gray-700">
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
