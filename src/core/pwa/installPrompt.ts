/**
 * 안드로이드 Chrome·삼성 인터넷은 설치할 수 있을 때 beforeinstallprompt를 한 번 보내요.
 * 그 이벤트를 붙잡아 두었다가 우리 버튼을 누르면 설치 창을 띄워요. 아이폰은 이 이벤트가 없어요.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** 앱이 뜰 때 한 번 불러요. 이벤트가 페이지 로드 직후에 오기 때문에 일찍 들어야 해요. */
export function listenForInstallPrompt(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** 설치 창을 띄워요. 붙잡아 둔 이벤트가 없으면 "unavailable"(안내 창을 보여 줘야 해요). */
export async function promptInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const e = deferred;
  if (!e) return "unavailable";
  // 같은 이벤트는 한 번만 쓸 수 있어요.
  deferred = null;
  emit();
  await e.prompt();
  return (await e.userChoice).outcome;
}
