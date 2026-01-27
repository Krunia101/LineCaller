/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, level, data } = req.body;

  // Terminal logging
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [ADMIN_DEBUG]`;

  if (level === "error") {
    console.error(`${logPrefix} ❌ ${message}`, data || "");
  } else if (level === "warn") {
    console.warn(`${logPrefix} ⚠️ ${message}`, data || "");
  } else {
    console.log(`${logPrefix} ✅ ${message}`, data || "");
  }

  res.status(200).json({ success: true });
}
