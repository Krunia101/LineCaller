/* eslint-disable @typescript-eslint/no-explicit-any */
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

type CalledQueue = {
  nomor: string;
  status: "called" | "entered" | "completed"; // called = baru dipanggil, entered = masuk, completed = selesai
};

export default function AdminClient() {
  const router = useRouter();

  // ===== STATE WAJIB (URUTAN HOOK AMAN)
  const [konter, setKonter] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lastNumber, setLastNumber] = useState<string>("---");
  const [socketReady, setSocketReady] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [calledQueue, setCalledQueue] = useState<CalledQueue[]>([]); // State untuk nomor yang dipanggil
  const [displayMode, setDisplayMode] = useState<"flex" | "grid">("grid"); // grid = default (empty), flex = with called items

  // Debug logger helper
  const addDebug = (
    message: string,
    level: "info" | "warn" | "error" = "info",
    data?: unknown
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    console.log(logMessage, data);
    setDebugLog((prev) => [...prev.slice(-20), logMessage]); // Keep last 20 logs

    // Kirim ke server untuk terminal logging
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: logMessage, level, data }),
    }).catch(() => {}); // Ignore fetch errors
  };
useEffect(() => {
  fetch("/api/socket")
    .then(() => console.log("✅ socket server initialized"))
    .catch(() => console.error("❌ socket init failed"));
}, []);

  // ===== AMBIL KONTER DARI LOCALSTORAGE
  useEffect(() => {
    try {
      addDebug("🔄 PHASE 1: Mengambil konter dari localStorage");
      const savedKonter = localStorage.getItem("konter");
      addDebug(`Data konter: ${savedKonter || "TIDAK ADA"}`);

      if (!savedKonter) {
        addDebug("⛔ Konter tidak ditemukan, redirect ke pilih-konter", "warn");
        router.replace("/admin/pilih-konter");
        return;
      }

      addDebug(`✨ Konter berhasil dimuat: ${savedKonter}`);
      setKonter(savedKonter);
      setLoading(false);
      addDebug("✅ Loading selesai");
    } catch (error) {
      addDebug(`localStorage error: ${String(error)}`, "error");
      setLoading(false);
    }
  }, [router]);

  // ===== SOCKET QUEUE LISTENER
  useEffect(() => {
    if (loading) {
      addDebug("⏳ Menunggu loading selesai...", "warn");
      return;
    }

    try {
      addDebug("🔄 PHASE 3: Setup queue listener");

      socket.on("queue-updated", (data: QueueItem[]) => {
        addDebug(`📬 Queue updated: ${data.length} item`, "info", data);
        setQueue(data);
        const lastNum = data.length ? data[data.length - 1].nomor : "---";
        setLastNumber(lastNum);
        addDebug(`🔢 Last number updated: ${lastNum}`);
      });

      socket.on("queue-error", (error) => {
        addDebug(`❌ Queue error dari server: ${String(error)}`, "error");
      });

      addDebug("✅ Queue listener registered");
    } catch (error) {
      addDebug(`Queue setup error: ${String(error)}`, "error");
    }

    return () => {
      socket.off("queue-updated");
      socket.off("queue-error");
    };
  }, [loading]);

  // ===== ACTIONS
  const tambahDanCetak = () => {
    try {
      addDebug("🔄 ACTION: tambahDanCetak dipanggil");
      addDebug(`Status: socketReady=${socketReady}, konter=${konter}`);

      if (!socketReady) {
        addDebug("❌ Socket belum siap!", "error");
        return;
      }

      addDebug("📤 Emit: add-queue");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.emit("add-queue", (response: any) => {
        if (response?.number) {
          setLastNumber(response.number);
          addDebug(`🔢 Last number (optimistic): ${response.number}`);
        }
      });

      setTimeout(() => {
        addDebug("🖨️ Memulai print");
        window.print();
      }, 500);
    } catch (error) {
      addDebug(`tambahDanCetak error: ${String(error)}`, "error");
    }
  };

  const panggil = (nomor: string) => {
    try {
      addDebug(`🔄 ACTION: panggil dipanggil`);
      addDebug(`Data: nomor=${nomor}, konter=${konter}`);

      socket.emit(
        "call-queue",
        {
          nomor,
          konter: Number(konter),
        },
        (response: any) => {
          addDebug(`✅ call-queue response: ${JSON.stringify(response)}`);
        }
      );
      
      // Tambah ke calledQueue dengan status "called"
      setCalledQueue((prev) => {
        const existing = prev.find((item) => item.nomor === nomor);
        if (!existing) {
          return [...prev, { nomor, status: "called" }];
        }
        return prev;
      });
      
      // Auto-switch to flex mode when calling someone
      setDisplayMode("flex");
      
      addDebug("📤 call-queue berhasil dikirim");
    } catch (error) {
      addDebug(`panggil error: ${String(error)}`, "error");
    }
  }; 

  const masuk = (nomor: string) => {
    try {
      addDebug(`🔄 ACTION: masuk dipanggil untuk nomor ${nomor}`);
      
      // Update status menjadi "entered"
      setCalledQueue((prev) =>
        prev.map((item) =>
          item.nomor === nomor ? { ...item, status: "entered" } : item
        )
      );
      
      socket.emit("patient-entered", { nomor, konter: Number(konter) }, (response: any) => {
        addDebug(`✅ patient-entered response: ${JSON.stringify(response)}`);
      });
      
      addDebug(`📤 masuk berhasil dikirim untuk nomor ${nomor}`);
    } catch (error) {
      addDebug(`masuk error: ${String(error)}`, "error");
    }
  };

  const selesai = (nomor: string) => {
    try {
      addDebug(`🔄 ACTION: selesai dipanggil untuk nomor ${nomor}`);
      
      // Update status menjadi "completed"
      setCalledQueue((prev) =>
        prev.map((item) =>
          item.nomor === nomor ? { ...item, status: "completed" } : item
        )
      );
      
      socket.emit("patient-completed", { nomor, konter: Number(konter) }, (response: any) => {
        addDebug(`✅ patient-completed response: ${JSON.stringify(response)}`);
      });
      
      // Hapus dari calledQueue setelah 1 detik
      setTimeout(() => {
        setCalledQueue((prev) => {
          const updated = prev.filter((item) => item.nomor !== nomor);
          // Auto-switch to grid mode when no one is called
          if (updated.length === 0) {
            setDisplayMode("grid");
          }
          return updated;
        });
      }, 1000);
      
      addDebug(`📤 selesai berhasil dikirim untuk nomor ${nomor}`);
    } catch (error) {
      addDebug(`selesai error: ${String(error)}`, "error");
    }
  };

  const resetSistem = () => {
    try {
      addDebug("🔄 ACTION: resetSistem dipanggil");
      socket.emit("reset-queue", (response: any) => {
        addDebug(`✅ reset-queue response: ${JSON.stringify(response)}`);
      });
    } catch (error) {
      addDebug(`resetSistem error: ${String(error)}`, "error");
    }
  };
  // ===== SOCKET CONNECTION CHECK
  useEffect(() => {
    try {
      addDebug("🔄 PHASE 2: Cek koneksi socket server");

      // Cek socket status
      addDebug(`Socket connected state: ${socket.connected}`);
      addDebug(`Socket ID: ${socket.id || "BELUM ADA"}`);

      if (socket.connected) {
        addDebug("✅ Socket sudah terhubung");
        setSocketReady(true);
      } else {
        addDebug("⏳ Menunggu socket connect...", "warn");
        socket.on("connect", () => {
          addDebug(`✅ Socket berhasil terhubung! ID: ${socket.id}`);
          setSocketReady(true);
        });
      }

      // Listen for disconnect
      socket.on("disconnect", (reason) => {
        addDebug(`🔌 Socket disconnect: ${reason}`, "warn");
        setSocketReady(false);
      });

      // Listen for connect_error
      socket.on("connect_error", (error) => {
        addDebug(`❌ Socket connect error: ${String(error)}`, "error");
      });

      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
      };
    } catch (error) {
      addDebug(`Socket setup error: ${String(error)}`, "error");
    }
  }, []);

  // ===== LOADING VIEW (WAJIB)
  if (loading || !socketReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">
            {loading
              ? "📦 Loading Admin Dashboard..."
              : "🔌 Connecting to Socket..."}
          </h1>
          <div className="inline-block animate-spin text-4xl">⏳</div>
        </div>

        {/* Debug Panel */}
        <div className="w-full max-w-2xl bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-xs overflow-y-auto max-h-64 border border-green-400">
          <div className="mb-2 font-bold text-yellow-300">🔍 DEBUG LOG:</div>
          {debugLog.length === 0 ? (
            <div>Initializing...</div>
          ) : (
            debugLog.map((log, idx) => (
              <div key={idx} className="mb-1 break-words">
                {log}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>Status: {loading ? "Loading" : "Socket Connecting"}</p>
          <p>Socket Ready: {socketReady ? "✅" : "❌"}</p>
          <p>Konter: {konter}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* ===== PANEL KIRI ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
        <img
          src="https://rsarbunda.com/wp-content/uploads/2024/07/head_logo.png"
          className="w-[0%] md:w-[155%]"
        />

        <h3 className="no-print text-[#718096] font-semibold tracking-widest uppercase mb-10 text-xs">
          Nomor Antrian Berikutnya
        </h3>

        <div className="print-area border-[8px] border-[#2DD4BF] w-full max-w-[460px] aspect-square flex flex-col items-center justify-center rounded-[5rem] shadow mb-14 bg-white">
          <div className="text-[80px] font-black text-[#0D9488]">
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
          onClick={() => resetSistem()}
          className="no-print mt-8 text-xs text-red-400 px-4 py-2 border border-red-400 rounded-lg transition-all duration-200 hover:bg-red-400 hover:text-white"
        >
          Reset Sistem
        </button>
      </div>

      {/* ===== PANEL TENGAH (YANG DIPANGGIL) ===== */}
      <div className="no-print w-full md:w-[1050px] bg-white border-l border-r flex flex-col items-center justify-center p-8">
        {/* ===== SECTION NOMOR YANG DIPANGGIL ===== */}
        {calledQueue.length > 0 && (
          <div className="w-full bg-gradient-to-b from-[#FEF3C7] to-[#FECACA] p-6 rounded-2xl border-2 border-orange-400 shadow-lg">
            <div className="text-xs font-black tracking-widest uppercase text-orange-800 mb-4">
              📢 Yang Dipanggil
            </div>
            <div className="space-y-4">
              {calledQueue.map((called) => (
                <div
                  key={called.nomor}
                  className={`p-4 rounded-xl transition-all duration-300 ${
                    called.status === "completed"
                      ? "bg-green-100 border-2 border-green-500"
                      : called.status === "entered"
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "bg-white border-2 border-orange-400"
                  }`}
                >
                  <div className="text-7xl md:text-9xl font-black text-center mb-4">
                    {called.nomor}
                  </div>
                  
                  {/* Tombol Bertahap */}
                  <div className="flex gap-3">
                    {called.status === "called" && (
                      <>
                        <button
                          onClick={() => masuk(called.nomor)}
                          className="flex-1 mx-0 md:mx-60 py-3 bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] text-white rounded-lg font-bold text-sm md:text-5xl tracking-widest hover:shadow-lg active:scale-95 transition-all"
                        >
                          ✅ MASUK
                        </button>
                      </>
                    )}
                    
                    {called.status === "entered" && (
                      <>
                        <button
                          onClick={() => selesai(called.nomor)}
                          className="flex-1 py-3 bg-gradient-to-b from-[#10B981] to-[#047857] text-white rounded-lg font-bold text-xs tracking-widest hover:shadow-lg active:scale-95 transition-all"
                        >
                          ✔️ SELESAI
                        </button>
                      </>
                    )}

                    {called.status === "completed" && (
                      <div className="flex-1 py-3 bg-green-200 text-green-800 rounded-lg font-bold text-xs tracking-widest text-center flex items-center justify-center">
                        ✅ SELESAI
                      </div>
                    )}
                  </div>

                  {/* Status Text */}
                  <div className="text-center mt-3 text-xs md:text-5xl font-semibold">
                    {called.status === "called" && (
                      <span className="text-orange-700">Status: Menunggu Masuk</span>
                    )}
                    {called.status === "entered" && (
                      <span className="text-blue-700">Status: Sudah Masuk</span>
                    )}
                    {called.status === "completed" && (
                      <span className="text-green-700">Status: Selesai</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <p className="text-center text-xs mt-2">Konter {konter}</p>
      </div>
    </div>
  );
}
