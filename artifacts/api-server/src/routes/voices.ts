import { Router, type IRouter } from "express";
import { listVoices, type ElevenVoice } from "../lib/elevenlabs";

const router: IRouter = Router();

// Voice list changes rarely — cache for an hour to keep StoryDetail preview
// chips off the ElevenLabs API.
let cache: { voices: ElevenVoice[]; at: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

async function voices(): Promise<ElevenVoice[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.voices;
  const v = await listVoices();
  cache = { voices: v, at: Date.now() };
  return v;
}

router.get("/voices/:voiceId/preview", async (req, res): Promise<void> => {
  const voice = (await voices()).find((v) => v.voiceId === req.params.voiceId);
  if (!voice?.previewUrl) {
    res.status(404).json({ error: "No preview for this voice" });
    return;
  }
  res.redirect(voice.previewUrl);
});

export default router;
