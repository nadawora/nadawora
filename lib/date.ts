const TZ = 'Asia/Seoul';

export function todayKST(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function addDays(iso: string, n: number): string {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function addYears(iso: string, n: number): string {
  const { y, m, d } = parts(iso);
  const t = new Date(Date.UTC(y + n, m - 1, d));
  if (t.getUTCMonth() !== m - 1) return new Date(Date.UTC(y + n, m, 0)).toISOString().slice(0, 10);
  return t.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function weekStart(iso: string): string {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export function monthStart(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function monthEnd(iso: string): string {
  const { y, m } = parts(iso);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function fmtLong(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${y}년 ${m}월 ${d}일 ${WD[weekday(iso)]}요일`;
}

export function fmtShort(iso: string): string {
  const { m, d } = parts(iso);
  return `${m}월 ${d}일 (${WD[weekday(iso)]})`;
}

export function fmtMD(iso: string): string {
  const { m, d } = parts(iso);
  return `${m}/${d}`;
}

export function weekNumber(iso: string): number {
  const { y, m, d } = parts(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
