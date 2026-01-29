/* eslint-disable react/no-unescaped-entities */
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

type QueueItemStatus = {
  nomor: string;
  isCalled: boolean; // track whether this item has been called
};

export default function AdminClient() {
  const router = useRouter();

  // ===== STATE WAJIB (URUTAN HOOK AMAN)
  const [konter, setKonter] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueItemStatus[]>([]); // track called status
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

      const handleQueueUpdated = (data: QueueItem[]) => {
        addDebug(`📬 Queue updated: ${data.length} item`, "info", data);
        
        // Update queue dengan tetap mempertahankan item yang sudah dipanggil
        setQueue((prevQueue) => {
          // Ambil item yang sudah dipanggil dari queueStatus
          const calledItems = prevQueue.filter((item) =>
            queueStatus.find((s) => s.nomor === item.nomor && s.isCalled)
          );
          
          // Merge: server data + item yang sudah dipanggil
          const merged = [...data];
          calledItems.forEach((calledItem) => {
            if (!merged.find((item) => item.nomor === calledItem.nomor)) {
              merged.push(calledItem);
            }
          });
          
          return merged;
        });
        
        // Update queueStatus: preserve isCalled status untuk item yang sudah dipanggil
        setQueueStatus((prev) => {
          const updated = [...prev];
          
          // Add new items dari server
          data.forEach((item) => {
            if (!updated.find((s) => s.nomor === item.nomor)) {
              updated.push({ nomor: item.nomor, isCalled: false });
            }
          });
          
          // Keep items that are still in the merged queue
          return updated.filter((s) => 
            data.find((item) => item.nomor === s.nomor) ||
            (s.isCalled) // Keep called items even if not in server data
          );
        });
        
        const lastNum = data.length ? data[data.length - 1].nomor : "---";
        setLastNumber(lastNum);
        addDebug(`🔢 Last number updated: ${lastNum}`);
      };

      socket.on("queue-updated", handleQueueUpdated);

      socket.on("queue-error", (error) => {
        addDebug(`❌ Queue error dari server: ${String(error)}`, "error");
      });

      addDebug("✅ Queue listener registered");
      
      return () => {
        socket.off("queue-updated", handleQueueUpdated);
        socket.off("queue-error");
      };
    } catch (error) {
      addDebug(`Queue setup error: ${String(error)}`, "error");
    }
  }, [loading, queueStatus]);

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
        addDebug("🖨️ Memulai silent print");
        
        // Silent print via Electron IPC
        if (typeof window !== 'undefined' && (window as any).require) {
          try {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.send('silent-print');
            ipcRenderer.once('silent-print-done', (event: any) => {
              addDebug(`✅ Silent print: ${event.success ? 'berhasil' : 'gagal - ' + event.failureReason}`, 
                event.success ? 'info' : 'error');
            });
          } catch (e) {
            addDebug("Electron IPC tidak tersedia, menggunakan window.print()", "warn");
            window.print();
          }
        } else {
          window.print();
        }
      }, 500);
    } catch (error) {
      addDebug(`tambahDanCetak error: ${String(error)}`, "error");
    }
  };

  const panggil = (nomor: string) => {
    try {
      addDebug(`🔄 ACTION: panggil dipanggil`);
      addDebug(`Data: nomor=${nomor}, konter=${konter}`);

      if (!socketReady) {
        addDebug("❌ Socket belum siap!", "error");
        return;
      }

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
      
      // Mark as called in queueStatus
      setQueueStatus((prev) =>
        prev.map((item) =>
          item.nomor === nomor ? { ...item, isCalled: true } : item
        )
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

  const panggilUlang = (nomor: string) => {
    try {
      addDebug(`🔄 ACTION: panggilUlang dipanggil`);
      addDebug(`Data: nomor=${nomor}, konter=${konter}`);

      if (!socketReady) {
        addDebug("❌ Socket belum siap!", "error");
        return;
      }

      socket.emit(
        "recall-queue",
        {
          nomor,
          konter: Number(konter),
        },
        (response: any) => {
          addDebug(`✅ recall-queue response: ${JSON.stringify(response)}`);
        }
      );
      
      // Reset status ke "called" jika sebelumnya sudah "entered" atau "completed"
      setCalledQueue((prev) => {
        const existing = prev.find((item) => item.nomor === nomor);
        if (existing) {
          return prev.map((item) =>
            item.nomor === nomor ? { ...item, status: "called" } : item
          );
        }
        // Jika belum ada, tambah baru
        return [...prev, { nomor, status: "called" }];
      });
      
      // Auto-switch to flex mode when recalling someone
      setDisplayMode("flex");
      
      addDebug("📤 recall-queue berhasil dikirim");
    } catch (error) {
      addDebug(`panggilUlang error: ${String(error)}`, "error");
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
      
      // Remove from queue list
      setQueue((prev) => prev.filter((item) => item.nomor !== nomor));
      setQueueStatus((prev) => prev.filter((item) => item.nomor !== nomor));
      
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
    <div className="min-h-screen bg-cyan-50 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* ===== PANEL KIRI ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white border-r border-cyan-100">
        <img
          src="https://rsarbunda.com/wp-content/uploads/2024/07/head_logo.png"
          className="w-[0%] md:w-[155%]"
        />

        <h3 className="no-print text-teal-700 font-medium tracking-widest uppercase mb-10 text-xs">
          Nomor Antrian Berikutnya
        </h3>

        <div className="print-area border-[8px] border-teal-300 w-full max-w-[460px] aspect-square flex flex-col items-center justify-center rounded-[5rem] shadow-sm mb-14 bg-cyan-50">
          <div className="text-[80px] font-black text-teal-700">
            {lastNumber}
          </div>
        </div>

        <button
          onClick={tambahDanCetak}
          className="no-print w-full max-w-[420px] py-7 bg-teal-600 text-white rounded-[2.5rem] shadow-sm active:scale-95 transition-all duration-200 hover:shadow-md hover:scale-105"
        >
          🖨️ CETAK & TAMBAH
        </button>

        <button
          onClick={() => resetSistem()}
          className="no-print mt-8 text-xs text-amber-600 px-4 py-2 border border-amber-600 rounded-lg transition-all duration-200 hover:bg-amber-600 hover:text-white"
        >
          Reset Sistem
        </button>
      </div>

      {/* ===== PANEL TENGAH (YANG DIPANGGIL) ===== */}
      <div className="no-print w-full md:w-[1050px] bg-white border-l border-r border-cyan-100 flex flex-col items-center justify-center p-8">
        {/* ===== SECTION NOMOR YANG DIPANGGIL ===== */}
        {calledQueue.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-8">
            <div className="text-6xl">📢</div>
            <h2 className="text-3xl font-bold text-slate-700">Panel Panggilan Pasien</h2>
            <p className="text-slate-600 text-lg max-w-md">
              Panel ini digunakan untuk mengelola pasien yang sedang dipanggil di Konter Anda.
            </p>
            
            <div className="w-full bg-cyan-50 p-6 rounded-2xl border border-cyan-200 space-y-4">
              <h3 className="text-xl font-semibold text-teal-700">📋 Alur Sistem Antrian:</h3>
              
              <div className="space-y-3 text-left">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <p className="font-medium text-slate-700">📥 Panel Kiri - Tambah Antrian</p>
                    <p className="text-slate-500 text-sm">Klik "🖨️ CETAK & TAMBAH" untuk menambah nomor antrian baru dan mencetak nomor antrian</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <p className="font-medium text-slate-700">📋 Panel Kanan - Pilih Pasien</p>
                    <p className="text-slate-500 text-sm">Pilih pasien dari daftar antrian, lalu klik "📢 PANGGIL" untuk memanggilnya</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <p className="font-medium text-slate-700">⚕️ Panel Tengah - Kelola Pasien</p>
                    <p className="text-slate-500 text-sm">Nomor akan tampil di sini. Klik "✅ MASUK" saat pasien masuk, lalu "✔️ SELESAI" setelah layanan selesai</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-cyan-100 border-l-4 border-teal-500 rounded">
                <p className="text-sm text-teal-700">
                  💡 <span className="font-semibold">Tips:</span> Gunakan ketiga panel secara bersamaan: Tambah → Panggil → Kelola
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-cyan-50 p-6 rounded-2xl border border-cyan-200 shadow-none">
            <div className="text-xs font-semibold tracking-widest uppercase text-teal-700 mb-4 flex items-center gap-2">
              <div className="px-3 py-1 bg-teal-600 text-white rounded-full">📢</div>
              Yang Sedang Dilayani
            </div>
            <div className="space-y-4">
              {calledQueue.map((called) => (
                <div
                  key={called.nomor}
                  className={`p-6 rounded-2xl transition-all duration-500 border-2 shadow-lg animate-in fade-in scale-in ${
                    called.status === "completed"
                      ? "bg-gradient-to-br from-orange-300 via-orange-200 to-yellow-100 border-orange-400 "
                      : called.status === "entered"
                      ? "bg-gradient-to-br from-green-200 via-teal-100 to-cyan-100 border-green-400 shadow-green-200"
                      : "bg-gradient-to-br from-blue-100 via-cyan-50 to-sky-50 border-blue-300 shadow-blue-100"
                  }`}
                >
                  {/* Nomor dengan animasi */}
                  <div className={`text-9xl md:text-9xl font-black text-center mb-6 transition-all duration-300 ${
                    called.status === "completed"
                      ? "text-orange-600 scale-110 animate-pulse"
                      : called.status === "entered"
                      ? "text-green-700 scale-100"
                      : "text-blue-600 animate-pulse"
                  }`}>
                    {called.nomor}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex justify-center mb-6">
                    <div className={`px-6 py-3 rounded-full font-bold text-white text-center text-lg tracking-widest ${
                      called.status === "completed"
                        ? "bg-gradient-to-r from-orange-500 to-yellow-500"
                        : called.status === "entered"
                        ? "bg-gradient-to-r from-green-500 to-teal-500"
                        : "bg-gradient-to-r from-blue-500 to-cyan-500"
                    }`}>
                      {called.status === "called" && "⏳ MENUNGGU MASUK"}
                      {called.status === "entered" && "👤 SUDAH MASUK"}
                      {called.status === "completed" && "✨ SELESAI"}
                    </div>
                  </div>
                  
                  {/* Tombol Bertahap */}
                  <div className="flex gap-4 mb-6">
                    {called.status === "called" && (
                      <>
                        <button
                          onClick={() => masuk(called.nomor)}
                          className="flex-1 mx-0 md:mx-40 py-5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-bold text-sm md:text-4xl tracking-widest hover:from-teal-700 hover:to-teal-600 active:scale-95 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform"
                        >
                          ✅ MASUK
                        </button>
                      </>
                    )}
                    
                    {called.status === "entered" && (
                      <>
                        <button
                          onClick={() => selesai(called.nomor)}
                          className="flex-1 mx-0 md:mx-40 py-5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold text-sm md:text-4xl tracking-widest hover:from-green-700 hover:to-green-600 active:scale-95 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform"
                        >
                          ✔️ SELESAI
                        </button>
                      </>
                    )}

                    {called.status === "completed" && (
                      <div 
                        className="flex-1 mx-0 md:mx-40 py-5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold text-sm md:text-4xl tracking-widest text-center flex items-center justify-center shadow-lg transform"
                      >
                        ✅ SELESAI
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-3 bg-white/30 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${
                      called.status === "completed"
                        ? "w-full bg-gradient-to-r from-orange-500 to-yellow-500"
                        : called.status === "entered"
                        ? "w-2/3 bg-gradient-to-r from-green-500 to-teal-500"
                        : "w-1/3 bg-gradient-to-r from-blue-500 to-cyan-500"
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== PANEL KANAN ===== */}
      <div className="no-print w-full md:w-[460px] bg-cyan-50 border-l border-cyan-100 p-10 flex flex-col">
        <div className="mb-6 text-center text-2xl font-semibold bg-teal-600 text-white p-4 rounded-2xl">
          Loket {konter}
        </div>

        <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-2xl border border-cyan-200 shadow-none">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-teal-700">
            📋 Daftar Antrian
          </h2>
          <span className="bg-teal-600 text-white px-4 py-2 rounded-xl tracking-wider font-semibold text-sm">
            {queue.length} Pasien
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {queue.map((item) => {
            const itemStatus = queueStatus.find((s) => s.nomor === item.nomor);
            const isCalled = itemStatus?.isCalled || false;
            return (
            <div
              key={item.nomor}
              className={`flex justify-between items-center rounded-xl p-4 shadow-none border transition-all ${
                isCalled ? 'bg-amber-50 border-amber-200' : 'bg-white border-cyan-200 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col flex-1">
                <div className="text-5xl font-black text-teal-600">
                  {item.nomor}
                </div>
                {isCalled && (
                  <div className="text-xs text-amber-600 font-semibold mt-1">✓ Sudah Dipanggil</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {!isCalled ? (
                  <button
                    onClick={() => panggil(item.nomor)}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold text-xs tracking-widest hover:bg-teal-700 active:scale-95 transition-all duration-200"
                  >
                    📢 PANGGIL
                  </button>
                ) : (
                  <button
                    onClick={() => panggilUlang(item.nomor)}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold text-xs tracking-widest hover:bg-amber-600 active:scale-95 transition-all duration-200"
                  >
                    🔄 PANGGIL ULANG
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* ===== STRUK PRINT ===== */}
      <div className="print-only fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center text-black font-mono">
        <p className="text-xs">RS AR BUNDA</p>
        <p className="text-6xl font-bold mt-4">{lastNumber}</p>
        <p className="text-xs mt-4">Konter {konter}</p>
      </div>
    </div>
  );
}
