import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkVoiceStatus, speakLine } from "@/lib/voice.functions";
import { defaultSampleLine, voicePresets } from "@/lib/voice/voices";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice setup — Talkdraw ElevenLabs key" },
      {
        name: "description",
        content:
          "Link your ElevenLabs voice key, check its remaining credit, and test youthful human voices for your Talkdraw companions.",
      },
      { property: "og:title", content: "Talkdraw voice setup" },
      {
        property: "og:description",
        content: "Verify your ElevenLabs key and preview young, natural human voices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const status = useServerFn(checkVoiceStatus);
  const speak = useServerFn(speakLine);
  const [text, setText] = useState(defaultSampleLine);
  const [playing, setPlaying] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["voice-status"],
    queryFn: () => status({}),
  });

  const preview = async (voiceId: string) => {
    if (playing) return;
    setPlaying(voiceId);
    try {
      const { audioBase64 } = await speak({ data: { text, voiceId } });
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      await audio.play();
      audio.onended = () => setPlaying(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice preview failed.");
      setPlaying(null);
    }
  };

  const s = statusQuery.data;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs uppercase tracking-[0.35em] text-primary">Voice</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
        ElevenLabs <span className="text-gradient">voice key</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        The key lives in the server environment only. Here you can confirm it works, see the credit
        left on it, and audition youthful human voices.
      </p>

      <section className="panel mt-8 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Key status</h2>
            {statusQuery.isPending ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking the key…
              </p>
            ) : s ? (
              <p className="mt-2 flex items-center gap-2 text-sm">
                {s.connected ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                {s.message}
              </p>
            ) : (
              <p className="mt-2 text-sm text-destructive">Could not reach the voice service.</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => statusQuery.refetch()}
            disabled={statusQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${statusQuery.isFetching ? "animate-spin" : ""}`} />
            Recheck
          </Button>
        </div>

        {s?.connected ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Plan" value={s.tier ?? "—"} />
            <Stat
              label="Credit left"
              value={
                s.charactersLimit
                  ? `${(s.charactersRemaining ?? 0).toLocaleString()} chars`
                  : "Not readable"
              }
            />
            <Stat
              label="Used"
              value={
                s.charactersLimit
                  ? `${(s.charactersUsed ?? 0).toLocaleString()} / ${s.charactersLimit.toLocaleString()}`
                  : "Speech verified live"
              }
            />

          </dl>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Test a voice</h2>
        <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Sample line
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={600}
          className="mt-2 w-full rounded-xl border border-border/70 bg-secondary/40 p-3 text-sm outline-none focus:border-primary/70"
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {voicePresets.map((voice) => (
            <article key={voice.id} className="panel rounded-2xl p-5">
              <h3 className="font-display font-bold">{voice.name}</h3>
              <p className="text-xs text-accent">{voice.vibe}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{voice.gender}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-4 w-full"
                disabled={!s?.connected || !!playing || text.trim().length === 0}
                onClick={() => preview(voice.id)}
              >
                {playing === voice.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {playing === voice.id ? "Playing" : "Preview"}
              </Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm font-medium">{value}</dd>
    </div>
  );
}
