const BASE_URL = "https://api.elevenlabs.io/v1";

export type ElevenVoice = {
  voiceId: string;
  name: string;
  category: string | null;
  description: string | null;
  previewUrl: string | null;
  gender: string | null;
  language: string | null;
};

const FALLBACK_VOICES: ElevenVoice[] = [
  { voiceId: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "premade", description: "Calm, warm female narrator", previewUrl: null, gender: "female", language: "en" },
  { voiceId: "AZnzlk1XvdvUeBnXmlld", name: "Domi", category: "premade", description: "Strong, confident female", previewUrl: null, gender: "female", language: "en" },
  { voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Bella", category: "premade", description: "Soft, young female", previewUrl: null, gender: "female", language: "en" },
  { voiceId: "ErXwobaYiN019PkySvjV", name: "Antoni", category: "premade", description: "Well-rounded male narrator", previewUrl: null, gender: "male", language: "en" },
  { voiceId: "VR6AewLTigWG4xSOukaG", name: "Arnold", category: "premade", description: "Crisp, deep male", previewUrl: null, gender: "male", language: "en" },
  { voiceId: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "premade", description: "Deep, mature male", previewUrl: null, gender: "male", language: "en" },
  { voiceId: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", category: "premade", description: "Raspy, dynamic male", previewUrl: null, gender: "male", language: "en" },
  { voiceId: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "premade", description: "Young male", previewUrl: null, gender: "male", language: "en" },
];

export async function listVoices(): Promise<ElevenVoice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return FALLBACK_VOICES;

  try {
    const r = await fetch(`${BASE_URL}/voices`, {
      headers: { "xi-api-key": apiKey },
    });
    if (!r.ok) return FALLBACK_VOICES;
    const data = (await r.json()) as { voices: Array<Record<string, any>> };
    return data.voices.map((v) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category ?? null,
      description: v.description ?? v.labels?.description ?? null,
      previewUrl: v.preview_url ?? null,
      gender: v.labels?.gender ?? null,
      language: v.labels?.language ?? "en",
    }));
  } catch {
    return FALLBACK_VOICES;
  }
}

const EMOTION_TO_STYLE: Record<string, { stability: number; style: number }> = {
  neutral: { stability: 0.55, style: 0.15 },
  happy: { stability: 0.4, style: 0.55 },
  excited: { stability: 0.3, style: 0.7 },
  sad: { stability: 0.7, style: 0.25 },
  angry: { stability: 0.35, style: 0.6 },
  scared: { stability: 0.4, style: 0.5 },
  whispering: { stability: 0.8, style: 0.1 },
  tense: { stability: 0.45, style: 0.45 },
  warm: { stability: 0.65, style: 0.3 },
  calm: { stability: 0.75, style: 0.2 },
};

export async function synthesize(opts: {
  text: string;
  voiceId: string;
  emotion?: string;
  stability?: number;
  similarity?: number;
  style?: number;
}): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const emo = EMOTION_TO_STYLE[opts.emotion ?? "neutral"] ?? EMOTION_TO_STYLE.neutral;
  const stability = opts.stability != null ? opts.stability / 100 : emo.stability;
  const style = opts.style != null ? opts.style / 100 : emo.style;
  const similarity = opts.similarity != null ? opts.similarity / 100 : 0.75;

  const r = await fetch(
    `${BASE_URL}/text-to-speech/${opts.voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability,
          similarity_boost: similarity,
          style,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`ElevenLabs error ${r.status}: ${txt.slice(0, 200)}`);
  }

  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

export const FALLBACK_VOICE_LIST = FALLBACK_VOICES;
