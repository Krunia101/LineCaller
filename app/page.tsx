"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
      }}
    >
      <h1>Sistem Antrian</h1>

      <button
        style={{ padding: "12px 24px", fontSize: 16 }}
        onClick={() => router.push("/admin")}
      >
        Buat Antrian
      </button>

      <button
        style={{ padding: "12px 24px", fontSize: 16 }}
        onClick={() => router.push("/display")}
      >
        Display Antrian
      </button>
    </div>
  );
}
