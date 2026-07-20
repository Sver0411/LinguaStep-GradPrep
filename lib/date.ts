const DAY_MS = 86_400_000;

/** Returns a stable YYYY-MM-DD key in the user's current local timezone. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function shiftLocalDateKey(key: string, days: number): string {
  const date = localDateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function addMilliseconds(iso: string, milliseconds: number): string {
  return new Date(new Date(iso).getTime() + milliseconds).toISOString();
}

export function addDays(iso: string, days: number): string {
  return addMilliseconds(iso, days * DAY_MS);
}

export function startOfLocalDayTimestamp(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
}

export function endOfLocalDayTimestamp(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return localDateKey(left) === localDateKey(right);
}

export function recentLocalDateKeys(today: string, count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    shiftLocalDateKey(today, index - count + 1),
  );
}

export function safeTimestamp(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : fallback;
}
