const HANGUL_ONLY = /^[가-힣]+$/;
const HANGUL_SYLLABLE = /[가-힣]/;

export function givenName(name: string): string {
  const t = name.trim();
  return HANGUL_ONLY.test(t) && t.length === 3 ? t.slice(1) : t;
}

export function vocative(name: string): string {
  const last = name.slice(-1);
  if (!HANGUL_SYLLABLE.test(last)) return name;
  const hasBatchim = (last.charCodeAt(0) - 0xac00) % 28 !== 0;
  return `${name}${hasBatchim ? "아" : "야"}`;
}

export function callName(name: string): string {
  return vocative(givenName(name));
}

export function greeting(name: string): string {
  const call = callName(name);
  return call === "" ? "오늘도 한 문장씩!" : `${call}, 오늘도 한 문장씩!`;
}

export function formatTodayLabel(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(d);
}
