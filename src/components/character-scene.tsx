import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reactToTouch } from "@/lib/touch.functions";
import { useCharacterTouch } from "@/lib/touch/useCharacterTouch";
import type {
  AiTouchDecision,
  CharacterState,
  TouchEventPayload,
  TouchTurn,
} from "@/lib/touch/types";
import type { Character } from "@/lib/characters";

const animationClass: Record<AiTouchDecision["animation"], string> = {
  idle: "",
  "lean-in": "anim-lean-in",
  recoil: "anim-recoil",
  nod: "anim-nod",
  "shake-head": "anim-shake",
  bounce: "anim-bounce",
  sway: "anim-sway",
  flustered: "anim-flustered",
  laugh: "anim-laugh",
};

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function CharacterScene({ character }: { character: Character }) {
  const call = useServerFn(reactToTouch);
  const [state, setState] = useState<CharacterState>({
    mood: "neutral",
    affinity: 0,
    energy: 0.6,
    interactionCount: 0,
  });
  const [turns, setTurns] = useState<TouchTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [animation, setAnimation] = useState<AiTouchDecision["animation"]>("idle");
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const inflight = useRef(false);

  const latest = turns[0];

  const handleTouch = useCallback(
    async (touch: TouchEventPayload) => {
      setRipple({ x: touch.x, y: touch.y, id: Date.now() });
      if (inflight.current) return;
      inflight.current = true;
      setThinking(true);
      try {
        const decision = (await call({
          data: {
            character: {
              name: character.name,
              title: character.title,
              tagline: character.tagline,
              traits: character.traits,
            },
            state,
            touch,
            history: turns.slice(0, 6).map((t) => ({
              region: t.touch.region,
              kind: t.touch.kind,
              durationMs: t.touch.durationMs,
              repeatCount: t.touch.repeatCount,
              mood: t.decision.mood,
              speech: t.decision.speech,
            })),
          },
        })) as AiTouchDecision;

        setAnimation("idle");
        requestAnimationFrame(() => setAnimation(decision.animation));
        setState((prev) => ({
          mood: decision.mood,
          affinity: clamp(prev.affinity + decision.affinityDelta),
          energy: clamp(prev.energy + decision.energyDelta),
          interactionCount: prev.interactionCount + 1,
        }));
        setTurns((prev) => [{ touch, decision }, ...prev].slice(0, 12));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The character could not respond.");
      } finally {
        inflight.current = false;
        setThinking(false);
      }
    },
    [call, character, state, turns],
  );

  const { frameRef, pressPoint, pressing, handlers } = useCharacterTouch({ onTouch: handleTouch });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="panel relative overflow-hidden rounded-3xl">
        <div
          ref={frameRef}
          {...handlers}
          role="application"
          aria-label={`Touch ${character.name} anywhere in the scene`}
          className="relative aspect-[3/4] w-full touch-none select-none"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <img
            src={character.image}
            alt={`${character.name}, ${character.title}`}
            draggable={false}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              animationClass[animation]
            } ${pressing ? "scale-[1.01]" : ""}`}
          />

          {ripple ? (
            <span
              key={ripple.id}
              className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 bg-primary/15 anim-ripple"
              style={{ left: `${ripple.x * 100}%`, top: `${ripple.y * 100}%` }}
            />
          ) : null}

          {pressing && pressPoint ? (
            <span
              className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30"
              style={{ left: `${pressPoint.x * 100}%`, top: `${pressPoint.y * 100}%` }}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            {thinking ? (
              <div className="panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                {character.name} is reacting…
              </div>
            ) : latest ? (
              <div className="panel animate-fade-in rounded-2xl p-4">
                <p className="text-[0.7rem] uppercase tracking-[0.25em] text-accent">
                  {latest.decision.expression}
                </p>
                <p className="mt-2 text-sm">{latest.decision.speech}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  tone: {latest.decision.voiceTone}
                </p>
              </div>
            ) : (
              <div className="panel rounded-2xl p-4 text-sm text-muted-foreground">
                Touch {character.name} anywhere — head, shoulder, hand. Tap, hold or swipe.
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="panel rounded-2xl p-5">
          <h2 className="font-display text-lg font-bold">{character.name}</h2>
          <p className="text-xs text-accent">{character.title}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Meter label="Mood" value={state.mood} />
            <Bar label="Affinity" value={(state.affinity + 1) / 2} />
            <Bar label="Energy" value={(state.energy + 1) / 2} />
            <Meter label="Interactions" value={String(state.interactionCount)} />
          </dl>
        </div>

        <div className="panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold">Touch log</h3>
          {turns.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No touches yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {turns.slice(0, 6).map((turn, i) => (
                <li key={i} className="rounded-lg border border-border/60 p-3 text-xs">
                  <p className="text-muted-foreground">
                    {turn.touch.kind} · {turn.touch.region} · {turn.touch.durationMs}ms · x
                    {turn.touch.repeatCount}
                  </p>
                  <p className="mt-1 text-foreground">{turn.decision.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="text-xs text-muted-foreground">{Math.round(value * 100)}%</dd>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}
