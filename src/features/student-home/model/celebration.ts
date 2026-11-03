export function celebrationKey(studentId: string): string {
  return `heesu:celebrated-goals:${studentId}`;
}

function parse(stored: string | null): number[] {
  if (stored === null) return [];
  try {
    const v: unknown = JSON.parse(stored);
    return Array.isArray(v) && v.every((n) => Number.isInteger(n))
      ? (v as number[])
      : [];
  } catch {
    return [];
  }
}

export function shouldCelebrate(
  stored: string | null,
  goal: number,
  points: number,
): boolean {
  return points >= goal && !parse(stored).includes(goal);
}

export function withCelebrated(stored: string | null, goal: number): string {
  return JSON.stringify(
    [...new Set([...parse(stored), goal])].sort((a, b) => a - b),
  );
}
