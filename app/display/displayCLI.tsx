"use client";

import { socket } from "@/lib/socket";
import { useCallback, useEffect, useState } from "react";

type Patient = {
  nomor: string;
  nama?: string;
  konter?: string;
  isRecall?: boolean;
};

export default function DisplayClient() {
  const [data, setData] = useState<Patient | null>(null);

  // ===== AMBIL KONTER (AMAN BUILD & EXE)
  const konter =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("konter") || "1"
      : "1";

  const playVoice = useCallback(async (text: string) => {
    try {
      console.log("🎤 playVoice called with text:", text);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.error(`❌ TTS fetch error: ${res.status} ${res.statusText}`);
        return;
      }

      const blob = await res.blob();
      console.log(`📁 Received blob: ${blob.size} bytes`);
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onplay = () => console.log("🔊 Audio playing");
      audio.onended = () => {
        console.log("✅ Audio ended");
        URL.revokeObjectURL(url);
      };
      audio.onerror = (e) => console.error("❌ Audio error:", e);
      
      await audio.play();
    } catch (err) {
      console.error("❌ playVoice error:", err);
    }
  }, []);

  useEffect(() => {
    // penting: bangunin socket server
    fetch("/api/socket").then(() => console.log("✅ Socket server initialized"));

    const handlePatientCalled = (payload: Patient) => {
      console.log("📢 Patient called event received:", payload);
      setData(payload);

      // Buat text berbeda untuk panggilan pertama vs panggilan ulang
      let teks: string;
      if (payload.isRecall) {
        // Panggilan ulang
        teks = payload.konter
          ? `Panggilan ulang. Untuk Nomor antrian ${payload.nomor}. Silakan ke Loket ${payload.konter}.`
          : `Panggilan ulang. Untuk Nomor antrian ${payload.nomor}. Silakan ke Loket pelayanan ${payload.konter}`;
      } else {
        // Panggilan pertama
        teks = payload.konter
          ? `Nomor antrian ${payload.nomor}. Silakan ke Loket ${payload.konter}.`
          : `Nomor antrian ${payload.nomor}. Silakan ke Loket pelayanan ${payload.konter}`;
      }

      console.log("🔊 Playing voice:", teks);
      playVoice(teks);
    };

    socket.on("patient-called", handlePatientCalled);

    return () => {
      socket.off("patient-called", handlePatientCalled);
    };
  }, [playVoice]);

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

            <div className="text-3xl mt-6">
              Silakan ke{" "}
              <span className="font-bold text-teal-600">
                Loket {data.konter ?? konter}
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
