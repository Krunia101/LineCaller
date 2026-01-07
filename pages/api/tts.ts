import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    // Menggunakan Google Translate TTS (Suara lebih luwes/natural)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=id&client=tw-ob`;

    const response = await fetch(url);
    
    if (!response.ok) throw new Error("Gagal mengambil suara dari Google");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set header agar browser mengenali ini sebagai file audio MP3
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memproses suara' });
  }
}