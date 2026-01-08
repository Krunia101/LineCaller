"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Patient = {
  nama: string;
  nomor: number;
  konter?: number;
};

export default function DisplayClient() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Patient | null>(null);
  const konter = searchParams?.get("konter") || "1";

  const playVoice = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetch("/api/socket");

    socket.on("patient-called", (payload: Patient) => {
      setData(payload);

      const teks = payload.konter
        ? `Nomor antrian. ${payload.nomor}. Silakan ke konter ${payload.konter}.`
        : `Nomor antrian. ${payload.nomor}. Silakan ke konter pelayanan.`;

      playVoice(teks);
    });

    return () => {
      socket.off("patient-called");
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-100 flex items-center justify-center px-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-teal-200 p-10 text-center">
        <h1 className="text-5xl font-extrabold text-teal-700 mb-10">
          ANTRIAN SAAT INI
        </h1>

        {data ? (
          <>
            <div className="text-[160px] font-black text-sky-600 leading-none">
              {data.nomor}
            </div>

            <div className="text-3xl mt-4">
              Silakan ke{" "}
              <span className="font-bold text-teal-600">
                Konter {konter}
              </span>
            </div>
          </>
        ) : (
          <div className="text-3xl text-gray-400 animate-pulse">
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
