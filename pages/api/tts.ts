import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

// Pastikan sudah set OPENAI_API_KEY di .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text kosong" });

  try {
    // Panggil OpenAI TTS
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",   // bisa ganti "aria" dll
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TTS error" });
  }
}
