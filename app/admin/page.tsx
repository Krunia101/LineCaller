"use client";

import { useRouter } from "next/navigation";

export default function PilihKonterPage() {
  const router = useRouter();

  const pilihKonter = (konter: number) => {
    router.push(`/admin/dashboard?konter=${konter}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] font-sans">
      <div className="bg-white p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] w-full max-w-md text-center">

        <h1 className="text-2xl font-black tracking-widest uppercase mb-4">
          Pilih Konter
        </h1>
        <p className="text-sm text-[#64748B] mb-10">
          Silakan pilih konter sebelum masuk sistem antrian
        </p>

        <div className="space-y-6">
          <button
            onClick={() => pilihKonter(1)}
            className="w-full py-6 rounded-2xl bg-gradient-to-b from-[#0EA5E9] to-[#0284C7] text-white font-black tracking-[0.2em] shadow-lg active:scale-95"
          >
            KONTER 1
          </button>

          <button
            onClick={() => pilihKonter(2)}
            className="w-full py-6 rounded-2xl bg-gradient-to-b from-[#10B981] to-[#059669] text-white font-black tracking-[0.2em] shadow-lg active:scale-95"
          >
            KONTER 2
          </button>
        </div>

        <p className="mt-10 text-[10px] text-[#94A3B8] tracking-widest uppercase">
          Linecaller System
        </p>
      </div>
    </div>
  );
}
