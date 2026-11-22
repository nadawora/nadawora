'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase 환경 변수가 설정되지 않았어요. README의 연결 순서를 확인해 주세요.');
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }
  return client;
}

// 임시 공개 모드: 로그인 없이 주인 워크스페이스를 바로 열어요. Vercel 환경 변수 NEXT_PUBLIC_OPEN_MODE=1 일 때만 켜져요.
// 로그인을 다시 켤 때는 이 변수를 지우고, Supabase의 "open mode" 정책을 지우면 돼요(docs/LOGIN.md).
export const OPEN_MODE = process.env.NEXT_PUBLIC_OPEN_MODE === '1';

export function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
