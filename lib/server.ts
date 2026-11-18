import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE 환경 변수가 없어요');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// 예약 실행(Vercel Cron) 요청인지 확인해요.
// CRON_SECRET 이 없으면 아무도 통과하지 못해요(예전에는 비어 있으면 누구나 통과하는 문제가 있었어요).
export function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(req.headers.get('authorization') || '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function slack(text: string, blocks?: unknown[]) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { ok: false, reason: 'SLACK_WEBHOOK_URL 없음' };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blocks ? { text, blocks } : { text }) });
  return { ok: res.ok, reason: res.ok ? '' : await res.text() };
}

export function siteUrl(req: Request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export function section(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}
