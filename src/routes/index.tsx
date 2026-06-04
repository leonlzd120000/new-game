import { createFileRoute } from "@tanstack/react-router";
import lottie from "lottie-web/build/player/lottie_light";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Lock,
  Mic,
  Volume2,
} from "lucide-react";
import confettiAnimation from "@/assets/confetti-full-screen.json";
import correctSound from "@/assets/correct.wav";
import defaultTreeImage from "@/assets/default-tree.png";
import followBrushTeethAudio from "@/assets/follow-audio/brush-teeth.m4a";
import followGetUpAudio from "@/assets/follow-audio/get-up.m4a";
import followGoToSchoolAudio from "@/assets/follow-audio/go-to-school.m4a";
import followWashFaceAudio from "@/assets/follow-audio/wash-face.m4a";
import tryAgainSound from "@/assets/try-again.wav";
import victorySound from "@/assets/victory.mp3";

export const Route = createFileRoute("/")({
  component: Index,
});

type Pair = { id: string; label: string; answer: string };
type TimerSettings = { minutes: number; seconds: number };
type SpeechScoreTone = "great" | "pass" | "practice";
type SpeechScoreResult = {
  score: number;
  feedback: string;
  tone: SpeechScoreTone;
};
type SentenceWordTone = "correct" | "wrong" | "neutral";
type SentenceWordToken = {
  text: string;
  tone: SentenceWordTone;
};
type PointerDragPreview = {
  answer: string;
  x: number;
  y: number;
};
type PointerAnswerDrag = PointerDragPreview & {
  pointerId: number;
};
type SpeechRecognitionAlternativeLike = {
  confidence?: number;
  transcript: string;
};
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};
type SpeechRecognitionErrorEventLike = {
  error?: string;
};
type SpeechRecognitionLike = {
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
type WorkspaceBaseConfig = {
  id: "follow-work" | "match-master" | "order-work";
  label: string;
  defaultTitle: string;
  view: "activity" | "placeholder";
};
type ActivityWorkspaceConfig = WorkspaceBaseConfig & {
  view: "activity";
  storageKey: string;
  imageKeys: readonly string[];
  imageLayout: "single" | "row4";
  titleKey: string;
  timerKey: string;
  timerDefaultVersionKey: string;
  timerDefaultVersion: string;
  timerDefault: TimerSettings;
  legacyTimerDefaults: TimerSettings[];
  defaultPairs: Pair[];
  legacyTitleMap?: Record<string, string>;
  pairsDefaultVersionKey?: string;
  pairsDefaultVersion?: string;
  showDropTargets: boolean;
  showAnswerTiles: boolean;
  showGameReset: boolean;
  showPairBoard: boolean;
  showTargetSentence: boolean;
  labelBoxesClickable: boolean;
};
type PlaceholderWorkspaceConfig = WorkspaceBaseConfig & {
  view: "placeholder";
  description: string;
};
type WorkspaceConfig = ActivityWorkspaceConfig | PlaceholderWorkspaceConfig;

const STORAGE_KEY = "tree-match-pairs-v1";
const IMAGE_KEY = "tree-match-image-v1";
const TITLE_KEY = "tree-match-title-v1";
const TIMER_KEY = "tree-match-timer-v1";
const TIMER_DEFAULT_VERSION_KEY = "tree-match-timer-default-version";
const FOLLOW_STORAGE_KEY = "follow-match-pairs-v1";
const FOLLOW_IMAGE_KEY = "follow-match-image-v1";
const FOLLOW_IMAGE_KEYS = [
  FOLLOW_IMAGE_KEY,
  "follow-match-image-2-v1",
  "follow-match-image-3-v1",
  "follow-match-image-4-v1",
] as const;
const FOLLOW_TITLE_KEY = "follow-match-title-v1";
const FOLLOW_TIMER_KEY = "follow-match-timer-v1";
const FOLLOW_TIMER_DEFAULT_VERSION_KEY = "follow-match-timer-default-version";
const FOLLOW_PAIRS_DEFAULT_VERSION_KEY = "follow-match-pairs-default-version";
const WORKSPACE_STORAGE_KEY = "active-workspace-v1";
const MATCH_TIMER_DEFAULT_VERSION = "2";
const SPEAK_TIMER_DEFAULT_VERSION = "3";
const FOLLOW_PAIRS_DEFAULT_VERSION = "1";
const DEFAULT_TITLE = "Match";
const FOLLOW_DEFAULT_TITLE = "Follow";
const DEFAULT_WORKSPACE_ID: WorkspaceConfig["id"] = "match-master";
const MATCH_TIMER_DEFAULT: TimerSettings = { minutes: 2, seconds: 0 };
const SPEAK_TIMER_DEFAULT: TimerSettings = { minutes: 4, seconds: 0 };
const LEGACY_ONE_MINUTE_TIMER: TimerSettings = { minutes: 1, seconds: 0 };
const DEFAULT_IMAGE = defaultTreeImage;
const EMPTY_TITLE_MAP: Record<string, string> = {};
const CELEBRATION_EXTRA_SECONDS = 0.5;
const CELEBRATION_BASE_SECONDS =
  (confettiAnimation.op - confettiAnimation.ip) / confettiAnimation.fr;
const CELEBRATION_PLAYBACK_SPEED =
  CELEBRATION_BASE_SECONDS / (CELEBRATION_BASE_SECONDS + CELEBRATION_EXTRA_SECONDS);
const APP_FRAME_MAX_WIDTH_CLASS = "max-w-[1124px]";
const MATCH_BOX_WIDTH_CLASS = "w-[170px] md:w-[186px]";

const DEFAULT_PAIRS: Pair[] = [
  { id: "1", label: "flowers", answer: "pink" },
  { id: "2", label: "leaves", answer: "green" },
  { id: "3", label: "branches", answer: "long" },
  { id: "4", label: "trunk", answer: "strong" },
  { id: "5", label: "roots", answer: "deep" },
];
const MATCH_IMAGE_KEYS = [IMAGE_KEY] as const;
const FOLLOW_DEFAULT_PAIRS: Pair[] = [
  { id: "1", label: "Get up", answer: "get up" },
  { id: "2", label: "Wash face", answer: "wash face" },
  { id: "3", label: "Brush teeth", answer: "brush teeth" },
  { id: "4", label: "Go to school", answer: "go to school" },
];
const FOLLOW_AUDIO_BY_LABEL: Record<string, string> = {
  "get up": followGetUpAudio,
  "wash face": followWashFaceAudio,
  "brush teeth": followBrushTeethAudio,
  "go to school": followGoToSchoolAudio,
};
const GROUP_WORK_PAIRS_DEFAULT_VERSION = "3";
const GROUP_WORK_DEFAULT_PAIRS: Pair[] = [
  {
    id: "1",
    label: "Look at the tree.",
    answer: "tree",
  },
  {
    id: "2",
    label: "The roots are deep.",
    answer: "roots",
  },
  {
    id: "3",
    label: "The trunk is strong.",
    answer: "trunk",
  },
  {
    id: "4",
    label: "The branches are green.",
    answer: "branches",
  },
];
const GROUP_WORK_LEGACY_SENTENCES = new Set([
  "These green branches have some beautiful red apples.",
  "The clever monkey jumps over the river branches.",
  "We must brush our teeth every morning.",
]);
const REMOVED_STORAGE_KEYS = ["match-master-stars-v1", "group-work-stars-v1"] as const;

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "follow-work",
    label: "Follow",
    defaultTitle: FOLLOW_DEFAULT_TITLE,
    view: "activity",
    storageKey: FOLLOW_STORAGE_KEY,
    imageKeys: FOLLOW_IMAGE_KEYS,
    imageLayout: "row4",
    titleKey: FOLLOW_TITLE_KEY,
    timerKey: FOLLOW_TIMER_KEY,
    timerDefaultVersionKey: FOLLOW_TIMER_DEFAULT_VERSION_KEY,
    timerDefaultVersion: MATCH_TIMER_DEFAULT_VERSION,
    timerDefault: MATCH_TIMER_DEFAULT,
    legacyTimerDefaults: [LEGACY_ONE_MINUTE_TIMER],
    defaultPairs: FOLLOW_DEFAULT_PAIRS,
    legacyTitleMap: {
      "Group Work": "Follow",
      Speak: "Follow",
      "Let's speak": "Follow",
      "Let's speak.": "Follow",
    },
    pairsDefaultVersionKey: FOLLOW_PAIRS_DEFAULT_VERSION_KEY,
    pairsDefaultVersion: FOLLOW_PAIRS_DEFAULT_VERSION,
    showDropTargets: true,
    showAnswerTiles: false,
    showGameReset: false,
    showPairBoard: false,
    showTargetSentence: false,
    labelBoxesClickable: false,
  },
  {
    id: "match-master",
    label: "Match",
    defaultTitle: DEFAULT_TITLE,
    view: "activity",
    storageKey: STORAGE_KEY,
    imageKeys: MATCH_IMAGE_KEYS,
    imageLayout: "single",
    titleKey: TITLE_KEY,
    timerKey: TIMER_KEY,
    timerDefaultVersionKey: TIMER_DEFAULT_VERSION_KEY,
    timerDefaultVersion: MATCH_TIMER_DEFAULT_VERSION,
    timerDefault: MATCH_TIMER_DEFAULT,
    legacyTimerDefaults: [LEGACY_ONE_MINUTE_TIMER],
    defaultPairs: DEFAULT_PAIRS,
    legacyTitleMap: { "Tree Match Master": "Match" },
    showDropTargets: true,
    showAnswerTiles: true,
    showGameReset: true,
    showPairBoard: true,
    showTargetSentence: false,
    labelBoxesClickable: false,
  },
  {
    id: "order-work",
    label: "Order",
    defaultTitle: "Order",
    view: "placeholder",
    description:
      "Order mode is ready in the menu. Add the sequence or ordering interaction here when you want to build the third activity.",
  },
];

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

function useTitle(
  storageKey: string,
  defaultTitle: string,
  legacyTitleMap: Record<string, string> = EMPTY_TITLE_MAP,
) {
  const [title, setTitle] = useState<string>(defaultTitle);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    setIsLoaded(false);
    try {
      const raw = localStorage.getItem(storageKey);
      const migratedTitle = raw ? (legacyTitleMap[raw] ?? raw) : defaultTitle;
      setTitle(migratedTitle);
      if (raw && migratedTitle !== raw) {
        localStorage.setItem(storageKey, migratedTitle);
      }
    } catch (error) {
      void error;
    }
    setIsLoaded(true);
  }, [defaultTitle, legacyTitleMap, storageKey]);
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, title);
    } catch (error) {
      void error;
    }
  }, [isLoaded, storageKey, title]);
  return [title, setTitle] as const;
}
function useImages(storageKeys: readonly string[]) {
  const [images, setImages] = useState<string[]>(() => storageKeys.map(() => DEFAULT_IMAGE));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    try {
      setImages(storageKeys.map((storageKey) => localStorage.getItem(storageKey) || DEFAULT_IMAGE));
    } catch (error) {
      void error;
      setImages(storageKeys.map(() => DEFAULT_IMAGE));
    }
    setIsLoaded(true);
  }, [storageKeys]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      storageKeys.forEach((storageKey, index) => {
        const image = images[index] || DEFAULT_IMAGE;
        if (image && image !== DEFAULT_IMAGE) localStorage.setItem(storageKey, image);
        else localStorage.removeItem(storageKey);
      });
    } catch (error) {
      void error;
    }
  }, [images, isLoaded, storageKeys]);

  return [images, setImages] as const;
}

function isSameTimer(a: TimerSettings, b: TimerSettings) {
  return a.minutes === b.minutes && a.seconds === b.seconds;
}

function useTimerSettings(
  storageKey: string,
  defaultVersionKey: string,
  defaultVersion: string,
  defaultTimer: TimerSettings,
  legacyDefaults: TimerSettings[],
) {
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(defaultTimer);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    setIsLoaded(false);
    try {
      const raw = localStorage.getItem(storageKey);
      const savedDefaultVersion = localStorage.getItem(defaultVersionKey);
      if (raw) {
        const saved = normalizeTimerSettings(JSON.parse(raw));
        const isOldDefault =
          savedDefaultVersion !== defaultVersion &&
          legacyDefaults.some((legacyTimer) => isSameTimer(saved, legacyTimer));
        setTimerSettings(isOldDefault ? defaultTimer : saved);
      } else {
        setTimerSettings(defaultTimer);
      }
      localStorage.setItem(defaultVersionKey, defaultVersion);
    } catch (error) {
      void error;
    }
    setIsLoaded(true);
  }, [defaultTimer, defaultVersion, defaultVersionKey, legacyDefaults, storageKey]);
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(timerSettings));
      localStorage.setItem(defaultVersionKey, defaultVersion);
    } catch (error) {
      void error;
    }
  }, [defaultVersion, defaultVersionKey, isLoaded, storageKey, timerSettings]);
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

function usePairs(
  storageKey: string,
  defaultPairs: Pair[],
  defaultVersionKey?: string,
  defaultVersion?: string,
) {
  const [pairs, setPairs] = useState<Pair[]>(defaultPairs);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    setIsLoaded(false);
    try {
      const raw = localStorage.getItem(storageKey);
      const savedVersion = defaultVersionKey ? localStorage.getItem(defaultVersionKey) : undefined;
      const savedPairs = raw ? (JSON.parse(raw) as Pair[]) : undefined;
      const hasLegacyPairs = savedPairs?.some((pair) =>
        GROUP_WORK_LEGACY_SENTENCES.has(pair.label),
      );
      const shouldUseDefaultPairs =
        Boolean(defaultVersionKey && defaultVersion) &&
        (savedVersion !== defaultVersion || Boolean(hasLegacyPairs));
      setPairs(shouldUseDefaultPairs ? defaultPairs : savedPairs || defaultPairs);
      if (defaultVersionKey && defaultVersion) {
        localStorage.setItem(defaultVersionKey, defaultVersion);
      }
    } catch (error) {
      void error;
    }
    setIsLoaded(true);
  }, [defaultPairs, defaultVersion, defaultVersionKey, storageKey]);
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(pairs));
    } catch (error) {
      void error;
    }
  }, [isLoaded, pairs, storageKey]);
  return [pairs, setPairs] as const;
}

function Index() {
  const [tab, setTab] = useState<"home" | "settings">("home");
  const [workspaceId, setWorkspaceId] = useState<WorkspaceConfig["id"]>(() => {
    if (typeof window === "undefined") return DEFAULT_WORKSPACE_ID;
    try {
      const storedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (storedWorkspaceId && WORKSPACES.some((workspace) => workspace.id === storedWorkspaceId)) {
        return storedWorkspaceId as WorkspaceConfig["id"];
      }
    } catch (error) {
      void error;
    }
    return DEFAULT_WORKSPACE_ID;
  });
  const workspace = WORKSPACES.find((item) => item.id === workspaceId) ?? WORKSPACES[0];

  useEffect(() => {
    try {
      REMOVED_STORAGE_KEYS.forEach((storageKey) => localStorage.removeItem(storageKey));
    } catch (error) {
      void error;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    } catch (error) {
      void error;
    }
  }, [workspaceId]);

  const selectWorkspace = (id: WorkspaceConfig["id"]) => {
    setWorkspaceId(id);
    setTab("home");
  };

  return (
    <div className="min-h-screen lg:flex" style={{ backgroundColor: "#fcf9f2" }}>
      <WorkspaceMenu activeWorkspaceId={workspace.id} onSelectWorkspace={selectWorkspace} />
      <div className="min-w-0 flex-1">
        <WorkspacePage key={workspace.id} workspace={workspace} tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}

function WorkspacePage({
  workspace,
  tab,
  setTab,
}: {
  workspace: WorkspaceConfig;
  tab: "home" | "settings";
  setTab: React.Dispatch<React.SetStateAction<"home" | "settings">>;
}) {
  if (workspace.view === "placeholder") {
    return (
      <WorkspaceShell
        title={workspace.defaultTitle}
        defaultTitle={workspace.defaultTitle}
        tab={tab}
        setTab={setTab}
      >
        {tab === "home" ? (
          <PlaceholderWorkspaceView
            title={workspace.defaultTitle}
            description={workspace.description}
          />
        ) : (
          <PlaceholderSettingsView title={workspace.defaultTitle} />
        )}
      </WorkspaceShell>
    );
  }

  const [pairs, setPairs] = usePairs(
    workspace.storageKey,
    workspace.defaultPairs,
    workspace.pairsDefaultVersionKey,
    workspace.pairsDefaultVersion,
  );
  const [images, setImages] = useImages(workspace.imageKeys);
  const [title, setTitle] = useTitle(
    workspace.titleKey,
    workspace.defaultTitle,
    workspace.legacyTitleMap,
  );
  const [timerSettings, setTimerSettings] = useTimerSettings(
    workspace.timerKey,
    workspace.timerDefaultVersionKey,
    workspace.timerDefaultVersion,
    workspace.timerDefault,
    workspace.legacyTimerDefaults,
  );

  useEffect(() => {
    if (workspace.imageLayout !== "row4") return;

    const targetCount = workspace.imageKeys.length;
    setPairs((current) => {
      const trimmed = current.slice(0, targetCount);
      if (trimmed.length === targetCount) {
        return current.length === targetCount ? current : trimmed;
      }

      const additions = Array.from({ length: targetCount - trimmed.length }, (_, index) => {
        const fallbackPair = workspace.defaultPairs[trimmed.length + index];
        return fallbackPair
          ? { ...fallbackPair }
          : {
              id: `${workspace.id}-label-${trimmed.length + index + 1}`,
              label: "",
              answer: "",
            };
      });

      return [...trimmed, ...additions];
    });
  }, [
    setPairs,
    workspace.defaultPairs,
    workspace.id,
    workspace.imageKeys.length,
    workspace.imageLayout,
  ]);

  return (
    <WorkspaceShell title={title} defaultTitle={workspace.defaultTitle} tab={tab} setTab={setTab}>
      <>
        {tab === "home" ? (
          <GameView
            key={workspace.id}
            pairs={pairs}
            images={images}
            imageLayout={workspace.imageLayout}
            timerSettings={timerSettings}
            showDropTargets={workspace.showDropTargets}
            showAnswerTiles={workspace.showAnswerTiles}
            showGameReset={workspace.showGameReset}
            showPairBoard={workspace.showPairBoard}
            showTargetSentence={workspace.showTargetSentence}
            labelBoxesClickable={workspace.labelBoxesClickable}
          />
        ) : (
          <SettingsView
            key={workspace.id}
            pairs={pairs}
            setPairs={setPairs}
            images={images}
            setImages={setImages}
            imageLayout={workspace.imageLayout}
            title={title}
            setTitle={setTitle}
            defaultTitle={workspace.defaultTitle}
            timerSettings={timerSettings}
            setTimerSettings={setTimerSettings}
            showAnswerFields={workspace.showAnswerTiles}
          />
        )}
      </>
    </WorkspaceShell>
  );
}

function WorkspaceShell({
  title,
  defaultTitle,
  tab,
  setTab,
  children,
}: {
  title: string;
  defaultTitle: string;
  tab: "home" | "settings";
  setTab: React.Dispatch<React.SetStateAction<"home" | "settings">>;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b bg-white/70 backdrop-blur">
        <div
          className={`${APP_FRAME_MAX_WIDTH_CLASS} mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-3`}
        >
          <div className="flex items-center gap-2">
            <h1>
              <button
                type="button"
                onClick={() => setTab("home")}
                style={{ fontFamily: "Arial, sans-serif" }}
                className="rounded-sm text-left text-lg font-bold text-slate-800 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {title || defaultTitle}
              </button>
            </h1>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setTab("home")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "home"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <HomeIcon size={16} /> Home
            </button>
            <button
              onClick={() => setTab("settings")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "settings"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <SettingsIcon size={16} /> Settings
            </button>
          </nav>
        </div>
      </header>
      <main className={`${APP_FRAME_MAX_WIDTH_CLASS} mx-auto px-6 py-4`}>{children}</main>
    </>
  );
}

function WorkspaceMenu({
  activeWorkspaceId,
  onSelectWorkspace,
}: {
  activeWorkspaceId: WorkspaceConfig["id"];
  onSelectWorkspace: (id: WorkspaceConfig["id"]) => void;
}) {
  return (
    <aside className="border-b border-amber-100/80 bg-transparent lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="px-4 py-4 lg:px-4 lg:py-6">
        <div className="rounded-[28px] border border-amber-100/80 bg-white/55 p-4 shadow-[0_12px_30px_rgba(148,101,24,0.06)] backdrop-blur-sm">
          <nav className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {WORKSPACES.map((workspace) => {
              const active = workspace.id === activeWorkspaceId;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onSelectWorkspace(workspace.id)}
                  className={`rounded-[22px] border px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_20px_rgba(15,23,42,0.14)]"
                      : "border-amber-100 bg-white/80 text-slate-700 shadow-sm hover:border-amber-300 hover:bg-amber-50/80 hover:text-slate-950"
                  }`}
                >
                  <span
                    className={`block text-[11px] uppercase tracking-[0.24em] ${
                      active ? "text-white/55" : "text-amber-700/60"
                    }`}
                  >
                    {String(WORKSPACES.indexOf(workspace) + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block text-base">{workspace.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}

function PlaceholderWorkspaceView({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Activity</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">{title}</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      </div>
    </section>
  );
}

function PlaceholderSettingsView({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">{title} settings</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        This workspace is available in the menu, but it does not have editable settings yet.
      </p>
    </section>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDropZonePairIdAtPoint(x: number, y: number) {
  const element = document.elementFromPoint(x, y);
  const dropZone = element?.closest<HTMLElement>("[data-drop-zone-pair-id]");
  return dropZone?.dataset.dropZonePairId ?? null;
}

function shuffleAnswers(pairs: Pair[]) {
  const answers = pairs.map((p) => p.answer);
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
}

function normalizeSpeechText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSpeechWords(value: string) {
  const normalized = normalizeSpeechText(value);
  return normalized ? normalized.split(" ") : [];
}

function getSentenceWordTokens(targetSentence: string, transcript: string): SentenceWordToken[] {
  const targetTokens = targetSentence
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({
      normalized: normalizeSpeechText(text),
      text,
    }));
  const transcriptWords = getSpeechWords(transcript);

  if (targetTokens.length === 0) return [];
  if (transcriptWords.length === 0) {
    return targetTokens.map((token) => ({
      text: token.text,
      tone: token.normalized ? "wrong" : "neutral",
    }));
  }

  const rowCount = targetTokens.length + 1;
  const columnCount = transcriptWords.length + 1;
  const distance = Array.from({ length: rowCount }, () => Array<number>(columnCount).fill(0));

  for (let row = 0; row < rowCount; row++) distance[row][0] = row;
  for (let column = 0; column < columnCount; column++) distance[0][column] = column;

  for (let row = 1; row < rowCount; row++) {
    for (let column = 1; column < columnCount; column++) {
      const cost = targetTokens[row - 1].normalized === transcriptWords[column - 1] ? 0 : 1;
      distance[row][column] = Math.min(
        distance[row - 1][column] + 1,
        distance[row][column - 1] + 1,
        distance[row - 1][column - 1] + cost,
      );
    }
  }

  const tones: SentenceWordTone[] = targetTokens.map((token) =>
    token.normalized ? "wrong" : "neutral",
  );
  let row = targetTokens.length;
  let column = transcriptWords.length;

  while (row > 0 || column > 0) {
    if (row > 0 && column > 0) {
      const isMatch = targetTokens[row - 1].normalized === transcriptWords[column - 1];
      const substitutionCost = isMatch ? 0 : 1;
      if (distance[row][column] === distance[row - 1][column - 1] + substitutionCost) {
        tones[row - 1] = targetTokens[row - 1].normalized
          ? isMatch
            ? "correct"
            : "wrong"
          : "neutral";
        row--;
        column--;
        continue;
      }
    }
    if (column > 0 && distance[row][column] === distance[row][column - 1] + 1) {
      column--;
      continue;
    }
    row--;
  }

  return targetTokens.map((token, index) => ({ text: token.text, tone: tones[index] }));
}

function wordEditDistance(source: string[], target: string[]) {
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = new Array<number>(target.length + 1);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex++) {
    current[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex++) {
      const cost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      current[targetIndex] = Math.min(
        current[targetIndex - 1] + 1,
        previous[targetIndex] + 1,
        previous[targetIndex - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[target.length];
}

function scoreSpeech(targetSentence: string, transcript: string): SpeechScoreResult {
  const targetWords = getSpeechWords(targetSentence);
  const transcriptWords = getSpeechWords(transcript);
  if (targetWords.length === 0 || transcriptWords.length === 0) {
    return {
      feedback: "没有识别到有效朗读，请再试一次。",
      score: 0,
      tone: "practice",
    };
  }

  const distance = wordEditDistance(targetWords, transcriptWords);
  const denominator = Math.max(targetWords.length, transcriptWords.length);
  const score = Math.max(0, Math.min(100, Math.round((1 - distance / denominator) * 100)));

  if (score >= 90) {
    return {
      feedback: "读得很完整，发音和目标句子非常接近。",
      score,
      tone: "great",
    };
  }
  if (score >= 75) {
    return {
      feedback: "整体不错，再注意单词清晰度和完整度。",
      score,
      tone: "pass",
    };
  }
  return {
    feedback: "再试一次，放慢速度，把每个单词读完整。",
    score,
    tone: "practice",
  };
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function GameView({
  pairs,
  images,
  imageLayout,
  timerSettings,
  showDropTargets,
  showAnswerTiles,
  showGameReset,
  showPairBoard,
  showTargetSentence,
  labelBoxesClickable,
}: {
  pairs: Pair[];
  images: string[];
  imageLayout: "single" | "row4";
  timerSettings: TimerSettings;
  showDropTargets: boolean;
  showAnswerTiles: boolean;
  showGameReset: boolean;
  showPairBoard: boolean;
  showTargetSentence: boolean;
  labelBoxesClickable: boolean;
}) {
  const [status, setStatus] = useState<Record<string, "correct" | "wrong" | undefined>>({});
  const [speakSequenceIndex, setSpeakSequenceIndex] = useState(0);
  const [speakCelebrating, setSpeakCelebrating] = useState(false);
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selectedPairId, setSelectedPairId] = useState<string | null>(() =>
    showTargetSentence ? (pairs[0]?.id ?? null) : null,
  );
  const [draggingAnswer, setDraggingAnswer] = useState<string | null>(null);
  const [pointerDragPreview, setPointerDragPreview] = useState<PointerDragPreview | null>(null);
  const [activeDropZoneId, setActiveDropZoneId] = useState<string | null>(null);
  const pointerDragRef = useRef<PointerAnswerDrag | null>(null);
  const [shuffled, setShuffled] = useState(() => pairs.map((p) => p.answer));
  const timerDurationSeconds = timerSettings.minutes * 60 + timerSettings.seconds;
  const [remainingSeconds, setRemainingSeconds] = useState(timerDurationSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const speakCelebrationTimerRef = useRef<number | null>(null);
  const followAudioRef = useRef<HTMLAudioElement | null>(null);
  const followSpeechTokenRef = useRef(0);
  const [speakingCardIndex, setSpeakingCardIndex] = useState<number | null>(null);
  const isMultiImageRow = imageLayout === "row4" && !showPairBoard;

  const allCorrect = pairs.length > 0 && pairs.every((p) => status[p.id] === "correct");

  useEffect(() => {
    setShuffled(shuffleAnswers(pairs));
    setSpeakSequenceIndex(0);
    setSpeakCelebrating(false);
    setSelectedPairId((current) => {
      const pairIds = new Set(pairs.map((pair) => pair.id));
      if (current && pairIds.has(current)) return current;
      return showTargetSentence ? (pairs[0]?.id ?? null) : null;
    });
  }, [pairs, showTargetSentence]);

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

  useEffect(() => {
    return () => {
      if (speakCelebrationTimerRef.current) {
        window.clearTimeout(speakCelebrationTimerRef.current);
      }
      followSpeechTokenRef.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      followAudioRef.current?.pause();
      followAudioRef.current = null;
    };
  }, []);

  const clearAnswerDrag = useCallback(() => {
    pointerDragRef.current = null;
    setDraggingAnswer(null);
    setPointerDragPreview(null);
    setActiveDropZoneId(null);
  }, []);

  const reset = () => {
    setStatus({});
    setUsed({});
    setPlaced({});
    setSelectedPairId(showTargetSentence ? (pairs[0]?.id ?? null) : null);
    clearAnswerDrag();
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setRemainingSeconds(timerDurationSeconds);
  };

  const onDrop = useCallback(
    (pairId: string, answer: string) => {
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
    },
    [pairs, status],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pointerDrag = pointerDragRef.current;
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
      const nextPreview = {
        answer: pointerDrag.answer,
        x: event.clientX,
        y: event.clientY,
      };
      pointerDragRef.current = { ...nextPreview, pointerId: event.pointerId };
      setPointerDragPreview(nextPreview);
      setActiveDropZoneId(getDropZonePairIdAtPoint(event.clientX, event.clientY));
      event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const pointerDrag = pointerDragRef.current;
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
      const pairId = getDropZonePairIdAtPoint(event.clientX, event.clientY);
      if (pairId) onDrop(pairId, pointerDrag.answer);
      clearAnswerDrag();
      event.preventDefault();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", clearAnswerDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", clearAnswerDrag);
    };
  }, [clearAnswerDrag, onDrop]);

  const startPointerAnswerDrag = (answer: string, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const pointerDrag = {
      answer,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    pointerDragRef.current = pointerDrag;
    setDraggingAnswer(answer);
    setPointerDragPreview(pointerDrag);
    setActiveDropZoneId(null);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      void error;
    }
    event.preventDefault();
  };

  const handleNativeAnswerDragChange = (answer: string | null) => {
    pointerDragRef.current = null;
    setPointerDragPreview(null);
    setActiveDropZoneId(null);
    setDraggingAnswer(answer);
  };

  const toggleLabelBox = (pairId: string) => {
    if (!labelBoxesClickable) return;
    setSelectedPairId(pairId);
  };

  const triggerSpeakCelebration = () => {
    if (speakCelebrationTimerRef.current) {
      window.clearTimeout(speakCelebrationTimerRef.current);
    }
    const audio = new Audio(victorySound);
    audio.play().catch(() => {});
    setSpeakCelebrating(false);
    window.setTimeout(() => setSpeakCelebrating(true), 0);
    speakCelebrationTimerRef.current = window.setTimeout(
      () => {
        setSpeakCelebrating(false);
        speakCelebrationTimerRef.current = null;
      },
      (CELEBRATION_BASE_SECONDS + CELEBRATION_EXTRA_SECONDS) * 1000,
    );
  };

  const updateSpeakResult = (pairId: string, passed: boolean) => {
    if (!passed) {
      setSpeakSequenceIndex(0);
      return;
    }

    const expectedPair = pairs[speakSequenceIndex];
    if (!expectedPair || expectedPair.id !== pairId) {
      setSpeakSequenceIndex(pairs[0]?.id === pairId ? 1 : 0);
      return;
    }

    const nextIndex = speakSequenceIndex + 1;
    if (nextIndex >= pairs.length) {
      setSpeakSequenceIndex(0);
      triggerSpeakCelebration();
      return;
    }

    setSpeakSequenceIndex(nextIndex);
  };

  const stopFollowAudio = useCallback(() => {
    if (!followAudioRef.current) return;
    followAudioRef.current.onended = null;
    followAudioRef.current.onerror = null;
    followAudioRef.current.pause();
    followAudioRef.current = null;
  }, []);

  const speakFollowLabel = useCallback(
    (text: string, index: number) => {
      const phrase = text.trim();
      if (!phrase) return;
      if (typeof window === "undefined") {
        return;
      }

      followSpeechTokenRef.current += 1;
      const token = followSpeechTokenRef.current;
      stopFollowAudio();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      setSpeakingCardIndex(index);
      if (typeof SpeechSynthesisUtterance !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = "en-US";
        utterance.pitch = 1;
        utterance.rate = 0.82;
        utterance.onend = () => {
          if (followSpeechTokenRef.current !== token) return;
          setSpeakingCardIndex(null);
        };
        utterance.onerror = () => {
          if (followSpeechTokenRef.current !== token) return;
          setSpeakingCardIndex(null);
        };
        window.speechSynthesis.speak(utterance);
        return;
      }

      const fallbackAudioSrc = FOLLOW_AUDIO_BY_LABEL[phrase.toLowerCase()];
      if (!fallbackAudioSrc) {
        setSpeakingCardIndex(null);
        return;
      }

      const audio = new Audio(fallbackAudioSrc);
      audio.preload = "auto";
      audio.onended = () => {
        if (followSpeechTokenRef.current !== token) return;
        followAudioRef.current = null;
        setSpeakingCardIndex(null);
      };
      audio.onerror = () => {
        if (followSpeechTokenRef.current !== token) return;
        followAudioRef.current = null;
        setSpeakingCardIndex(null);
      };
      followAudioRef.current = audio;
      audio.play().catch(() => {
        if (followSpeechTokenRef.current !== token) return;
        followAudioRef.current = null;
        setSpeakingCardIndex(null);
      });
    },
    [stopFollowAudio],
  );

  const selectedSentence = pairs.find((pair) => pair.id === selectedPairId)?.label;
  const followCardLabels = images.map(
    (_, index) => pairs[index]?.label.trim() || `Name ${index + 1}`,
  );

  if (pairs.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
        No pairs configured. Add some in Settings.
      </div>
    );
  }

  return (
    <div>
      <CelebrationAnimation play={allCorrect || speakCelebrating} />

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

      <div
        className={`flex rounded-2xl border bg-white/60 p-6 ${
          showPairBoard ? "min-h-[360px] items-stretch gap-8" : "items-center justify-center"
        }`}
      >
        <div
          className={
            showPairBoard && showDropTargets
              ? "flex h-[312px] shrink-0 items-stretch justify-center"
              : `flex shrink-0 items-stretch justify-center ${
                  isMultiImageRow
                    ? "w-full"
                    : showPairBoard
                      ? "w-56"
                      : "w-full max-w-[320px] md:max-w-[420px]"
                }`
          }
        >
          {isMultiImageRow ? (
            <div className="grid w-full gap-4 md:grid-cols-4">
              {images.map((image, index) => (
                <div
                  key={`follow-image-${index}`}
                  className="rounded-2xl border border-amber-100 bg-white/80 p-3 shadow-sm"
                >
                  <div className="flex h-full flex-col gap-3">
                    {image ? (
                      <img
                        src={image}
                        alt={`Reference ${index + 1}`}
                        className="h-[220px] w-full rounded-xl border border-amber-100 bg-white select-none object-contain"
                      />
                    ) : (
                      <div className="flex h-[220px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 text-center text-xs text-slate-400">
                        Image {index + 1}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => speakFollowLabel(followCardLabels[index], index)}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                        speakingCardIndex === index
                          ? "border-amber-400 bg-white text-amber-950 shadow-[0_0_0_2px_rgba(245,158,11,0.14)]"
                          : "border-amber-200 bg-amber-50 text-slate-800 hover:bg-amber-100"
                      }`}
                    >
                      <span>{followCardLabels[index]}</span>
                      {speakingCardIndex === index && (
                        <span
                          aria-hidden="true"
                          className="relative inline-flex h-5 w-5 items-center justify-center"
                        >
                          <span className="absolute inset-0 rounded-full bg-amber-300/60 animate-ping" />
                          <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-amber-600">
                            <Volume2 size={14} />
                          </span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : images[0] ? (
            <img
              src={images[0]}
              alt="Reference"
              className={`select-none pointer-events-none rounded-md ${
                showPairBoard && showDropTargets
                  ? "h-full w-auto object-contain"
                  : "max-h-[420px] w-full object-contain"
              }`}
            />
          ) : (
            <div className="flex h-full w-56 items-center justify-center rounded-md border-2 border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
              Upload an image in Settings to display it here.
            </div>
          )}
        </div>

        {showPairBoard && (
          <div className={`flex flex-1 flex-col gap-3 ${showDropTargets ? "justify-between" : ""}`}>
            {pairs.map((p) => {
              const labelSelected = selectedPairId === p.id;
              const labelColorClass = labelSelected
                ? "border-amber-500 bg-amber-100 shadow-sm"
                : "border-slate-700 bg-white";
              const labelBoxClassName = `border-2 rounded-md px-4 font-bold text-slate-800 flex items-center transition ${labelColorClass} ${
                showDropTargets
                  ? `h-full ${MATCH_BOX_WIDTH_CLASS}`
                  : `min-h-16 w-full py-3 text-left leading-snug ${
                      showTargetSentence ? "h-full text-2xl" : "max-w-[560px]"
                    }`
              } ${
                labelBoxesClickable
                  ? "cursor-pointer hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  : ""
              }`;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 ${showDropTargets || showTargetSentence ? "flex-1" : ""}`}
                >
                  {labelBoxesClickable ? (
                    <button
                      type="button"
                      aria-pressed={labelSelected}
                      onClick={() => toggleLabelBox(p.id)}
                      className={labelBoxClassName}
                    >
                      {p.label}
                    </button>
                  ) : (
                    <div className={labelBoxClassName}>{p.label}</div>
                  )}
                  {showDropTargets && (
                    <>
                      <div className="w-[54px] border-t-2 border-dashed border-slate-400" />
                      <DropZone
                        pairId={p.id}
                        status={status[p.id]}
                        value={placed[p.id]}
                        isPointerOver={activeDropZoneId === p.id}
                        onDrop={(ans) => onDrop(p.id, ans)}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showTargetSentence && selectedSentence && (
        <SpeakingPracticePanel
          targetSentence={selectedSentence}
          onResult={(tone) => {
            if (selectedPairId) {
              updateSpeakResult(selectedPairId, tone === "great" || tone === "pass");
            }
          }}
        />
      )}

      {showAnswerTiles && (
        <div className="flex flex-wrap gap-3 mt-8 justify-center">
          {shuffled.map((ans, i) => (
            <Draggable
              key={ans + i}
              value={ans}
              used={!!used[ans]}
              onNativeDragChange={handleNativeAnswerDragChange}
              onPointerDragStart={startPointerAnswerDrag}
            />
          ))}
        </div>
      )}

      {pointerDragPreview && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md bg-amber-300 px-5 py-3 text-lg font-semibold text-amber-950 shadow-lg ring-2 ring-amber-500/40"
          style={{ left: pointerDragPreview.x, top: pointerDragPreview.y }}
        >
          {pointerDragPreview.answer}
        </div>
      )}

      {allCorrect && (
        <p className="mt-6 text-center text-2xl font-bold text-green-600">🎉 Great job!</p>
      )}

      {showGameReset && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 rounded-lg bg-amber-500 text-white font-bold shadow hover:bg-amber-600 active:scale-95 transition"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function SpeakingPracticePanel({
  targetSentence,
  onResult,
}: {
  targetSentence: string;
  onResult?: (tone: SpeechScoreTone) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);
  const tryAgainAudioRef = useRef<HTMLAudioElement | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [scoreResult, setScoreResult] = useState<SpeechScoreResult | null>(null);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setErrorMessage("");
    setIsListening(false);
    setScoreResult(null);
    setTranscript("");
  }, [targetSentence]);

  useEffect(() => {
    correctAudioRef.current = new Audio(correctSound);
    tryAgainAudioRef.current = new Audio(tryAgainSound);
    correctAudioRef.current.preload = "auto";
    tryAgainAudioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      correctAudioRef.current?.pause();
      tryAgainAudioRef.current?.pause();
    };
  }, []);

  const resetAudio = useCallback((audio: HTMLAudioElement) => {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch (error) {
      void error;
    }
  }, []);

  const primeResultAudio = useCallback(() => {
    const audios = [correctAudioRef.current, tryAgainAudioRef.current].filter(
      (audio): audio is HTMLAudioElement => Boolean(audio),
    );

    audios.forEach((audio) => {
      audio.muted = true;
      void audio
        .play()
        .then(() => {
          resetAudio(audio);
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    });
  }, [resetAudio]);

  const playResultAudio = useCallback(
    (tone: SpeechScoreTone) => {
      const audio =
        tone === "great" || tone === "pass" ? correctAudioRef.current : tryAgainAudioRef.current;
      if (!audio) return;

      resultAudioRef.current?.pause();
      resultAudioRef.current = audio;
      resetAudio(audio);
      audio.muted = false;
      audio.play().catch(() => {});
    },
    [resetAudio],
  );

  useEffect(() => {
    if (scoreResult) playResultAudio(scoreResult.tone);
  }, [playResultAudio, scoreResult]);

  const applyScore = (spokenText: string) => {
    const cleanTranscript = spokenText.trim();
    setTranscript(cleanTranscript);
    const nextScoreResult = scoreSpeech(targetSentence, cleanTranscript);
    setScoreResult(nextScoreResult);
    onResult?.(nextScoreResult.tone);
  };

  const startRealScoring = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    primeResultAudio();

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setErrorMessage("当前浏览器不支持语音识别。请使用 Chrome 后再试。");
      setScoreResult(null);
      setTranscript("");
      return;
    }

    const recognition = new Recognition();
    let latestTranscript = "";
    let hadError = false;
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index++) {
        const transcriptPart = event.results[index][0]?.transcript;
        if (transcriptPart) parts.push(transcriptPart);
      }
      latestTranscript = parts.join(" ").trim();
      setTranscript(latestTranscript);
    };
    recognition.onerror = (event) => {
      hadError = true;
      setIsListening(false);
      const isPermissionError =
        event.error === "not-allowed" || event.error === "service-not-allowed";
      setErrorMessage(
        isPermissionError
          ? "麦克风权限未开启。请允许浏览器使用麦克风后再试。"
          : "语音识别失败，请确认麦克风可用后再试。",
      );
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (hadError) return;
      if (!latestTranscript) {
        setErrorMessage("没有识别到朗读内容，请靠近麦克风再试一次。");
        setScoreResult(null);
        return;
      }
      setErrorMessage("");
      applyScore(latestTranscript);
    };

    setErrorMessage("");
    setScoreResult(null);
    setTranscript("");
    setIsListening(true);
    try {
      recognition.start();
    } catch (error) {
      void error;
      setIsListening(false);
      setErrorMessage("语音识别无法启动，请稍后再试。");
    }
  };

  const resultColorClass =
    scoreResult?.tone === "great"
      ? "border-green-200 bg-green-50 text-green-700"
      : scoreResult?.tone === "pass"
        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
        : "border-red-200 bg-red-50 text-red-700";
  const resultLabel =
    scoreResult?.tone === "great"
      ? "Excellent!"
      : scoreResult?.tone === "pass"
        ? "Good!"
        : scoreResult
          ? "Try again."
          : "";
  const sentenceWordTokens = getSentenceWordTokens(targetSentence, transcript);

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-3 shadow-sm">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              TARGET SENTENCE / 目标句子
            </p>
            <p className="mt-1 text-2xl font-bold leading-tight text-slate-900">{targetSentence}</p>
          </div>
          <div className="justify-self-center text-center">
            <button
              type="button"
              onClick={startRealScoring}
              className={`inline-flex min-h-14 items-center justify-center gap-4 rounded-2xl px-10 text-xl font-bold text-white shadow-xl transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                isListening
                  ? "bg-gradient-to-r from-red-500 to-pink-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              }`}
            >
              <Mic size={28} />
              {isListening ? "正在听...点击结束" : "I can read"}
            </button>
          </div>
          <div aria-hidden="true" />
        </div>
        {(transcript || scoreResult || errorMessage) && (
          <div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">
            {transcript && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">识别结果</p>
                <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-base font-semibold">
                  {sentenceWordTokens.map((token, index) => (
                    <span
                      key={`${token.text}-${index}`}
                      className={
                        token.tone === "correct"
                          ? "rounded bg-green-50 px-1.5 py-0.5 text-green-700"
                          : token.tone === "wrong"
                            ? "rounded bg-red-50 px-1.5 py-0.5 text-red-600"
                            : "rounded bg-slate-100 px-1.5 py-0.5 text-slate-600"
                      }
                    >
                      {token.text}
                    </span>
                  ))}
                </p>
              </div>
            )}
            {scoreResult && (
              <div className={`rounded-xl border px-4 py-3 ${resultColorClass}`}>
                <p className="text-2xl font-bold">{resultLabel}</p>
                <p className="mt-1 text-sm font-semibold">{scoreResult.feedback}</p>
              </div>
            )}
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-5 px-8 text-center">
        <p className="inline-flex items-center gap-2 text-lg font-bold text-slate-500">
          <Lock size={20} />
          智能提示：基础语音打分基于浏览器语音识别和文本相似度计算。
        </p>
        <p className="mt-3 text-sm font-bold text-rose-500">
          ⚠️ AI生成内容（已人工审核）——基础语音打分仅供参考，教师仍需人工指导发音
        </p>
      </div>
    </section>
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
  onNativeDragChange,
  onPointerDragStart,
}: {
  value: string;
  used: boolean;
  onNativeDragChange: (value: string | null) => void;
  onPointerDragStart: (value: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  return (
    <div
      draggable={!used}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", value);
        onNativeDragChange(value);
      }}
      onDragEnd={() => onNativeDragChange(null)}
      onPointerDown={(event) => {
        if (!used) onPointerDragStart(value, event);
      }}
      className={`touch-none px-6 py-3 rounded-md text-lg font-semibold select-none shadow-sm transition ${
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
  pairId,
  status,
  value,
  isPointerOver,
  onDrop,
}: {
  pairId: string;
  status?: "correct" | "wrong";
  value?: string;
  isPointerOver: boolean;
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
        data-drop-zone-pair-id={pairId}
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
        className={`${MATCH_BOX_WIDTH_CLASS} h-full min-h-12 border-2 border-dashed rounded-md px-4 text-lg font-semibold flex items-center justify-center transition ${
          status === "correct"
            ? "border-green-500 bg-green-50 text-green-800"
            : status === "wrong"
              ? "border-red-500 bg-red-50 text-red-700 animate-pulse"
              : over || isPointerOver
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
  images,
  setImages,
  imageLayout,
  title,
  setTitle,
  defaultTitle,
  timerSettings,
  setTimerSettings,
  showAnswerFields,
}: {
  pairs: Pair[];
  setPairs: React.Dispatch<React.SetStateAction<Pair[]>>;
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  imageLayout: "single" | "row4";
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  defaultTitle: string;
  timerSettings: TimerSettings;
  setTimerSettings: React.Dispatch<React.SetStateAction<TimerSettings>>;
  showAnswerFields: boolean;
}) {
  const usesFixedButtonNames = imageLayout === "row4" && !showAnswerFields;

  const update = (id: string, field: "label" | "answer", value: string) => {
    setPairs((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };
  const add = () => setPairs((ps) => [...ps, { id: Date.now().toString(), label: "", answer: "" }]);
  const remove = (id: string) => setPairs((ps) => ps.filter((p) => p.id !== id));

  const updateImageAtIndex = (index: number, nextImage: string | null) => {
    setImages((current) =>
      current.map((image, imageIndex) => (imageIndex === index ? nextImage : image)),
    );
  };

  const onUpload = (file: File | null | undefined, index: number) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      updateImageAtIndex(index, typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const updateTimer = (field: keyof TimerSettings, value: string) => {
    const limit = field === "minutes" ? 99 : 59;
    const nextValue = Math.max(0, Math.min(limit, Math.trunc(Number(value) || 0)));
    setTimerSettings((current) => ({ ...current, [field]: nextValue }));
  };

  return (
    <div className={`mx-auto space-y-6 ${usesFixedButtonNames ? "max-w-4xl" : "max-w-2xl"}`}>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Page title</h2>
        <p className="text-sm text-slate-500 mb-4">Shown in the header on the home page.</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={defaultTitle}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div className="bg-white rounded-xl border p-6">
        {usesFixedButtonNames ? (
          <>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Follow cards</h2>
            <p className="text-sm text-slate-500 mb-4">
              Set each Follow card separately: its image and its button text.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {images.map((image, index) => (
                <div
                  key={`follow-setting-card-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Card {index + 1}
                  </p>
                  <div className="h-44 w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
                    {image ? (
                      <img
                        src={image}
                        alt={`Uploaded ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-amber-600">
                      {image ? "Replace image" : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onUpload(e.target.files?.[0], index)}
                      />
                    </label>
                    {image && image !== DEFAULT_IMAGE && (
                      <button
                        onClick={() => updateImageAtIndex(index, DEFAULT_IMAGE)}
                        className="rounded-md px-3 py-2 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Use default image
                      </button>
                    )}
                  </div>
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Button text
                    <input
                      value={pairs[index]?.label ?? ""}
                      onChange={(e) => {
                        const pairId = pairs[index]?.id;
                        if (pairId) update(pairId, "label", e.target.value);
                      }}
                      placeholder="Get up"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              {imageLayout === "row4" ? "Reference images" : "Reference image"}
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              {imageLayout === "row4"
                ? "Upload 4 images shown in one row on the home page."
                : "Upload the image shown on the home page. Recommended: 840×1080 px."}
            </p>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center overflow-hidden bg-slate-50">
                {images[0] ? (
                  <img src={images[0]} alt="Uploaded" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">No image</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-md cursor-pointer hover:bg-amber-600 w-fit">
                  {images[0] ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUpload(e.target.files?.[0], 0)}
                  />
                </label>
                {images[0] && images[0] !== DEFAULT_IMAGE && (
                  <button
                    onClick={() => updateImageAtIndex(0, DEFAULT_IMAGE)}
                    className="text-xs text-slate-500 hover:text-red-600 w-fit"
                  >
                    Use default image
                  </button>
                )}
              </div>
            </div>
          </>
        )}
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

      {!usesFixedButtonNames && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            {showAnswerFields ? "Match pairs" : "Sentences"}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {showAnswerFields
              ? "The label appears in the solid box on the left. The answer is the correct yellow tile to drag into its dashed box."
              : "Edit the sentence buttons shown on the activity page."}
          </p>
          <div
            className={`grid gap-3 text-xs font-medium text-slate-500 uppercase mb-2 px-1 ${
              showAnswerFields ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_auto]"
            }`}
          >
            <div>{showAnswerFields ? "Label (solid box)" : "Sentence"}</div>
            {showAnswerFields && <div>Answer (dashed box)</div>}
            <div></div>
          </div>
          <div className="space-y-2">
            {pairs.map((p) => (
              <div
                key={p.id}
                className={`grid gap-3 ${
                  showAnswerFields ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_auto]"
                }`}
              >
                <input
                  value={p.label}
                  onChange={(e) => update(p.id, "label", e.target.value)}
                  placeholder={showAnswerFields ? "flowers" : "Look at the tree."}
                  className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {showAnswerFields && (
                  <input
                    value={p.answer}
                    onChange={(e) => update(p.id, "answer", e.target.value)}
                    placeholder="pink"
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                )}
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
            <Plus size={16} /> {showAnswerFields ? "Add pair" : "Add sentence"}
          </button>
        </div>
      )}
    </div>
  );
}
