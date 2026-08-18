const API = "https://api.elevenlabs.io";

export type VoiceStatus = {
  connected: boolean;
  message: string;
  tier?: string;
  charactersUsed?: number;
  charactersLimit?: number;
  charactersRemaining?: number;
  resetsAt?: string | null;
};

function apiKey(): string {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured for this project.");
  return key;
}

async function probeSpeech(key: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API}/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hi.", model_id: "eleven_multilingual_v2" }),
    },
  );
  if (res.ok) return { ok: true, message: "Speech generation works." };
  const body = await res.text();
  if (res.status === 401 && body.includes("quota"))
    return { ok: false, message: "The key is valid but has no character credit left." };
  return { ok: false, message: `Voice check failed (${res.status}): ${body.slice(0, 200)}` };
}

export async function getVoiceStatus(): Promise<VoiceStatus> {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) {
    return { connected: false, message: "No ElevenLabs key is linked to this project yet." };
  }

  const res = await fetch(`${API}/v1/user/subscription`, {
    headers: { "xi-api-key": key },
  });

  if (!res.ok) {
    const body = await res.text();
    // Some keys are scoped to speech only and cannot read the account summary.
    if (res.status === 401 && body.includes("missing_permissions")) {
      const probe = await probeSpeech(key);
      return probe.ok
        ? {
            connected: true,
            message:
              "Key is live and generating speech. It is scoped to speech only, so the credit balance is not readable.",
            tier: "speech-only key",
          }
        : { connected: false, message: probe.message };
    }
    return {
      connected: false,
      message: `ElevenLabs rejected the key (${res.status}): ${body.slice(0, 200)}`,
    };
  }

  const sub = (await res.json()) as {
    tier?: string;
    character_count?: number;
    character_limit?: number;
    next_character_count_reset_unix?: number | null;
  };

  const used = sub.character_count ?? 0;
  const limit = sub.character_limit ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    connected: true,
    message:
      remaining > 0
        ? `Key is live with ${remaining.toLocaleString()} characters of credit left.`
        : "Key is valid but the character credit is used up.",
    tier: sub.tier ?? "unknown",
    charactersUsed: used,
    charactersLimit: limit,
    charactersRemaining: remaining,
    resetsAt: sub.next_character_count_reset_unix
      ? new Date(sub.next_character_count_reset_unix * 1000).toISOString()
      : null,
  };
}

export async function synthesize(input: {
  text: string;
  voiceId: string;
}): Promise<{ audioBase64: string }> {
  const res = await fetch(
    `${API}/v1/text-to-speech/${input.voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true,
          speed: 1,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice generation failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const buffer = await res.arrayBuffer();
  return { audioBase64: Buffer.from(buffer).toString("base64") };
}
