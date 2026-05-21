import { createFileRoute } from "@tanstack/react-router";
import lottie from "lottie-web/build/player/lottie_light";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  Plus,
  Trash2,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import confettiAnimation from "@/assets/confetti-full-screen.json";
import defaultTreeImage from "@/assets/default-tree.png";
import victorySound from "@/assets/victory.mp3";

export const Route = createFileRoute("/")({
  component: Index,
});

type Pair = { id: string; label: string; answer: string };
type TimerSettings = { minutes: number; seconds: number };

const STORAGE_KEY = "tree-match-pairs-v1";
const IMAGE_KEY = "tree-match-image-v1";
const TITLE_KEY = "tree-match-title-v1";
const TIMER_KEY = "tree-match-timer-v1";
const TIMER_DEFAULT_VERSION_KEY = "tree-match-timer-default-version";
const TIMER_DEFAULT_VERSION = "2";
const DEFAULT_TITLE = "Tree Match Master";
const DEFAULT_TIMER: TimerSettings = { minutes: 2, seconds: 0 };
const DEFAULT_IMAGE = defaultTreeImage;
const CELEBRATION_EXTRA_SECONDS = 0.5;
const CELEBRATION_BASE_SECONDS =
  (confettiAnimation.op - confettiAnimation.ip) / confettiAnimation.fr;
const CELEBRATION_PLAYBACK_SPEED =
  CELEBRATION_BASE_SECONDS / (CELEBRATION_BASE_SECONDS + CELEBRATION_EXTRA_SECONDS);

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function normalizeTimerSettings(value: unknown): TimerSettings {
  const settings = value && typeof value === "object" ? (value as Partial<TimerSettings>) : {};
  return {
    minutes: Math.max(0, Math.min(99, Math.trunc(Number(settings.minutes) || 0))),
    seconds: Math.max(0, Math.min(59, Math.trunc(Number(settings.seconds) || 0))),
  };
}

function useTitle() {
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TITLE_KEY);
      if (raw) setTitle(raw);
    } catch (error) {
      void error;
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (loaded.current) {
      try {
        localStorage.setItem(TITLE_KEY, title);
      } catch (error) {
        void error;
      }
    }
  }, [title]);
  return [title, setTitle] as const;
}
const DEFAULT_PAIRS: Pair[] = [
  { id: "1", label: "flowers", answer: "pink" },
  { id: "2", label: "leaves", answer: "green" },
  { id: "3", label: "branches", answer: "long" },
  { id: "4", label: "trunk", answer: "strong" },
  { id: "5", label: "roots", answer: "deep" },
];

function useImage() {
  const [image, setImage] = useState<string | null>(DEFAULT_IMAGE);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(IMAGE_KEY);
      setImage(raw || DEFAULT_IMAGE);
    } catch (error) {
      void error;
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      if (image && image !== DEFAULT_IMAGE) localStorage.setItem(IMAGE_KEY, image);
      else localStorage.removeItem(IMAGE_KEY);
    } catch (error) {
      void error;
    }
  }, [image]);
  return [image, setImage] as const;
}

function useTimerSettings() {
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(DEFAULT_TIMER);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      const defaultVersion = localStorage.getItem(TIMER_DEFAULT_VERSION_KEY);
      if (raw) {
        const saved = normalizeTimerSettings(JSON.parse(raw));
        const isOldDefault =
          defaultVersion !== TIMER_DEFAULT_VERSION && saved.minutes === 1 && saved.seconds === 0;
        setTimerSettings(isOldDefault ? DEFAULT_TIMER : saved);
      }
      localStorage.setItem(TIMER_DEFAULT_VERSION_KEY, TIMER_DEFAULT_VERSION);
    } catch (error) {
      void error;
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timerSettings));
      localStorage.setItem(TIMER_DEFAULT_VERSION_KEY, TIMER_DEFAULT_VERSION);
    } catch (error) {
      void error;
    }
  }, [timerSettings]);
  return [timerSettings, setTimerSettings] as const;
}

function playTone(ok: boolean) {
  try {
    const audioWindow = window as AudioContextWindow;
    const AC = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    if (ok) {
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      o.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
    } else {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(220, ctx.currentTime);
      o.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
    }
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch (error) {
    void error;
  }
}

function usePairs() {
  const [pairs, setPairs] = useState<Pair[]>(DEFAULT_PAIRS);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPairs(JSON.parse(raw));
    } catch (error) {
      void error;
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs));
    } catch (error) {
      void error;
    }
  }, [pairs]);
  return [pairs, setPairs] as const;
}

function Index() {
  const [tab, setTab] = useState<"home" | "settings">("home");
  const [pairs, setPairs] = usePairs();
  const [image, setImage] = useImage();
  const [title, setTitle] = useTitle();
  const [timerSettings, setTimerSettings] = useTimerSettings();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fcf9f2" }}>
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1>
              <button
                type="button"
                onClick={() => setTab("home")}
                style={{ fontFamily: "Arial, sans-serif" }}
                className="rounded-sm text-left text-lg font-bold text-slate-800 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {title || DEFAULT_TITLE}
              </button>
            </h1>
          </div>
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTab("home")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === "home"
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <HomeIcon size={16} /> Home
            </button>
            <button
              onClick={() => setTab("settings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === "settings"
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <SettingsIcon size={16} /> Settings
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-4">
        {tab === "home" ? (
          <GameView pairs={pairs} image={image} timerSettings={timerSettings} />
        ) : (
          <SettingsView
            pairs={pairs}
            setPairs={setPairs}
            image={image}
            setImage={setImage}
            title={title}
            setTitle={setTitle}
            timerSettings={timerSettings}
            setTimerSettings={setTimerSettings}
          />
        )}
      </main>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function shuffleAnswers(pairs: Pair[]) {
  const answers = pairs.map((p) => p.answer);
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
}

function GameView({
  pairs,
  image,
  timerSettings,
}: {
  pairs: Pair[];
  image: string | null;
  timerSettings: TimerSettings;
}) {
  const [status, setStatus] = useState<Record<string, "correct" | "wrong" | undefined>>({});
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [draggingAnswer, setDraggingAnswer] = useState<string | null>(null);
  const [shuffled, setShuffled] = useState(() => pairs.map((p) => p.answer));
  const timerDurationSeconds = timerSettings.minutes * 60 + timerSettings.seconds;
  const [remainingSeconds, setRemainingSeconds] = useState(timerDurationSeconds);
  const [timerRunning, setTimerRunning] = useState(false);

  const allCorrect = pairs.length > 0 && pairs.every((p) => status[p.id] === "correct");

  useEffect(() => {
    setShuffled(shuffleAnswers(pairs));
  }, [pairs]);

  useEffect(() => {
    const clearDraggingAnswer = () => setDraggingAnswer(null);
    window.addEventListener("pointerup", clearDraggingAnswer);
    return () => window.removeEventListener("pointerup", clearDraggingAnswer);
  }, []);

  useEffect(() => {
    if (!allCorrect) return;
    const audio = new Audio(victorySound);
    audio.play().catch(() => {});
  }, [allCorrect]);

  useEffect(() => {
    setTimerRunning(false);
    setRemainingSeconds(timerDurationSeconds);
  }, [timerDurationSeconds]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (timerRunning && remainingSeconds === 0) {
      setTimerRunning(false);
    }
  }, [remainingSeconds, timerRunning]);

  const reset = () => {
    setStatus({});
    setUsed({});
    setPlaced({});
    setDraggingAnswer(null);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setRemainingSeconds(timerDurationSeconds);
  };

  const onDrop = (pairId: string, answer: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair || status[pairId] === "correct") return;
    const ok = pair.answer.trim().toLowerCase() === answer.trim().toLowerCase();
    setPlaced((current) => ({ ...current, [pairId]: answer }));
    setStatus((s) => ({ ...s, [pairId]: ok ? "correct" : "wrong" }));
    if (ok) setUsed((u) => ({ ...u, [answer]: true }));
    playTone(ok);
    if (!ok) {
      setTimeout(() => {
        setStatus((s) => ({ ...s, [pairId]: undefined }));
        setPlaced((current) => {
          const next = { ...current };
          delete next[pairId];
          return next;
        });
      }, 900);
    }
  };

  if (pairs.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
        No pairs configured. Add some in Settings.
      </div>
    );
  }

  return (
    <div>
      <CelebrationAnimation play={allCorrect} />

      <div className="mb-3 flex items-center justify-end gap-3">
        <div className="flex w-64 justify-center rounded-lg border bg-white/80 px-3 py-2 shadow-sm">
          <span
            style={{ fontFamily: '"Avenir Next", "Helvetica Neue", Arial, sans-serif' }}
            className="block min-w-[68px] text-center text-xl font-semibold tabular-nums text-red-600"
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>
        <TimerControls
          timerRunning={timerRunning}
          canStart={timerDurationSeconds > 0 && remainingSeconds > 0}
          onStart={() => setTimerRunning(true)}
          onStop={() => setTimerRunning(false)}
          onReset={resetTimer}
        />
      </div>

      <div className="flex gap-8 items-stretch bg-white/60 rounded-2xl p-6 border">
        <div className="flex items-stretch">
          {image ? (
            <img
              src={image}
              alt="Reference"
              className="h-full w-auto object-contain select-none pointer-events-none rounded-md"
            />
          ) : (
            <div className="w-56 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center text-center text-xs text-slate-400 p-4">
              Upload an image in Settings to display it here.
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-3">
          {pairs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 flex-1">
              <div className="w-[260px] md:w-[292px] h-full border-2 border-slate-700 rounded-md px-4 bg-white font-bold text-slate-800 flex items-center">
                {p.label}
              </div>
              <div className="w-[54px] border-t-2 border-dashed border-slate-400" />
              <DropZone
                status={status[p.id]}
                value={placed[p.id]}
                activeAnswer={draggingAnswer}
                onDrop={(ans) => onDrop(p.id, ans)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-8 justify-center">
        {shuffled.map((ans, i) => (
          <Draggable key={ans + i} value={ans} used={!!used[ans]} onPick={setDraggingAnswer} />
        ))}
      </div>

      {allCorrect && (
        <p className="mt-6 text-center text-2xl font-bold text-green-600">🎉 Great job!</p>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={reset}
          className="px-8 py-3 rounded-lg bg-amber-500 text-white font-bold shadow hover:bg-amber-600 active:scale-95 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function CelebrationAnimation({ play }: { play: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!play || !containerRef.current) return;

    const animation = lottie.loadAnimation({
      animationData: confettiAnimation,
      autoplay: false,
      container: containerRef.current,
      loop: false,
      renderer: "svg",
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
      },
    });
    animation.setSpeed(CELEBRATION_PLAYBACK_SPEED);
    animation.play();

    return () => animation.destroy();
  }, [play]);

  if (!play) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function TimerControls({
  timerRunning,
  canStart,
  onStart,
  onStop,
  onReset,
}: {
  timerRunning: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-white/80 px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart || timerRunning}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-green-600 px-3 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        <Play size={14} /> Start
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={!timerRunning}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        <Square size={14} /> Stop
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-amber-500 px-3 text-xs font-semibold text-white transition hover:bg-amber-600"
      >
        <RotateCcw size={14} /> Reset
      </button>
    </div>
  );
}

function Draggable({
  value,
  used,
  onPick,
}: {
  value: string;
  used: boolean;
  onPick: (value: string | null) => void;
}) {
  return (
    <div
      draggable={!used}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", value);
        onPick(value);
      }}
      onDragEnd={() => onPick(null)}
      onPointerDown={() => {
        if (!used) onPick(value);
      }}
      className={`px-6 py-3 rounded-md text-lg font-semibold select-none shadow-sm transition ${
        used
          ? "bg-amber-100 text-amber-300 cursor-not-allowed line-through"
          : "bg-amber-300 text-amber-950 cursor-grab active:cursor-grabbing hover:bg-amber-400 hover:shadow"
      }`}
    >
      {value}
    </div>
  );
}

function DropZone({
  status,
  value,
  activeAnswer,
  onDrop,
}: {
  status?: "correct" | "wrong";
  value?: string;
  activeAnswer: string | null;
  onDrop: (val: string) => void;
}) {
  const [over, setOver] = useState(false);
  const dropAnswer = (answer: string) => {
    setOver(false);
    if (answer) onDrop(answer);
  };
  return (
    <div className="relative">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          const v = e.dataTransfer.getData("text/plain");
          dropAnswer(v);
        }}
        onPointerUp={() => {
          if (activeAnswer) dropAnswer(activeAnswer);
        }}
        className={`w-[260px] md:w-[292px] h-full min-h-12 border-2 border-dashed rounded-md px-4 text-lg font-semibold flex items-center justify-center transition ${
          status === "correct"
            ? "border-green-500 bg-green-50 text-green-800"
            : status === "wrong"
              ? "border-red-500 bg-red-50 text-red-700 animate-pulse"
              : over
                ? "border-slate-700 bg-slate-100 text-slate-800"
                : "border-slate-400 bg-white/70 text-slate-800"
        }`}
      >
        {value}
      </div>
      {status === "correct" && (
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center">
          <Check size={16} />
        </div>
      )}
      {status === "wrong" && (
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center">
          <X size={16} />
        </div>
      )}
    </div>
  );
}

function SettingsView({
  pairs,
  setPairs,
  image,
  setImage,
  title,
  setTitle,
  timerSettings,
  setTimerSettings,
}: {
  pairs: Pair[];
  setPairs: React.Dispatch<React.SetStateAction<Pair[]>>;
  image: string | null;
  setImage: React.Dispatch<React.SetStateAction<string | null>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  timerSettings: TimerSettings;
  setTimerSettings: React.Dispatch<React.SetStateAction<TimerSettings>>;
}) {
  const update = (id: string, field: "label" | "answer", value: string) => {
    setPairs((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };
  const add = () => setPairs((ps) => [...ps, { id: Date.now().toString(), label: "", answer: "" }]);
  const remove = (id: string) => setPairs((ps) => ps.filter((p) => p.id !== id));

  const onUpload = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const updateTimer = (field: keyof TimerSettings, value: string) => {
    const limit = field === "minutes" ? 99 : 59;
    const nextValue = Math.max(0, Math.min(limit, Math.trunc(Number(value) || 0)));
    setTimerSettings((current) => ({ ...current, [field]: nextValue }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Page title</h2>
        <p className="text-sm text-slate-500 mb-4">Shown in the header on the home page.</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={DEFAULT_TITLE}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Reference image</h2>
        <p className="text-sm text-slate-500 mb-4">
          Upload the image shown on the home page. Recommended: 840×1080 px.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center overflow-hidden bg-slate-50">
            {image ? (
              <img src={image} alt="Uploaded" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">No image</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-md cursor-pointer hover:bg-amber-600 w-fit">
              {image ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onUpload(e.target.files?.[0])}
              />
            </label>
            {image && image !== DEFAULT_IMAGE && (
              <button
                onClick={() => setImage(DEFAULT_IMAGE)}
                className="text-xs text-slate-500 hover:text-red-600 w-fit"
              >
                Use default image
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Timer</h2>
        <p className="text-sm text-slate-500 mb-4">Set the countdown used on the home page.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            Minutes
            <input
              type="number"
              min={0}
              max={99}
              value={timerSettings.minutes}
              onChange={(e) => updateTimer("minutes", e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Seconds
            <input
              type="number"
              min={0}
              max={59}
              value={timerSettings.seconds}
              onChange={(e) => updateTimer("seconds", e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Match pairs</h2>
        <p className="text-sm text-slate-500 mb-6">
          The label appears in the solid box on the left. The answer is the correct yellow tile to
          drag into its dashed box.
        </p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium text-slate-500 uppercase mb-2 px-1">
          <div>Label (solid box)</div>
          <div>Answer (dashed box)</div>
          <div></div>
        </div>
        <div className="space-y-2">
          {pairs.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-3">
              <input
                value={p.label}
                onChange={(e) => update(p.id, "label", e.target.value)}
                placeholder="flowers"
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <input
                value={p.answer}
                onChange={(e) => update(p.id, "answer", e.target.value)}
                placeholder="pink"
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <button
                onClick={() => remove(p.id)}
                className="px-3 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={add}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700"
        >
          <Plus size={16} /> Add pair
        </button>
      </div>
    </div>
  );
}
