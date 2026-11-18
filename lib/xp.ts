import { sb } from './supabase';

export const XP_RULES = {
  main: 50,
  sub: 15,
  mini: 10,
  more: 20,
  max: 30,
  daily: 20,
  weekly: 50,
  monthly: 100,
  diet: 10,
};

export const LEVEL_SIZE = 300;

export function levelOf(xp: number) {
  const level = Math.floor(xp / LEVEL_SIZE) + 1;
  const inLevel = xp % LEVEL_SIZE;
  return { level, inLevel, need: LEVEL_SIZE, pct: Math.round((inLevel / LEVEL_SIZE) * 100) };
}

export async function totalXp(ws: string): Promise<number> {
  const db = sb();
  const [q, h, r, d] = await Promise.all([
    db.from('quests').select('kind').eq('workspace_id', ws).eq('status', 'done'),
    db.from('habit_logs').select('level').eq('workspace_id', ws),
    db.from('retros').select('kind').eq('workspace_id', ws),
    db.from('diet_logs').select('id', { count: 'exact', head: true }).eq('workspace_id', ws),
  ]);
  let xp = 0;
  (q.data || []).forEach((x: { kind: 'main' | 'sub' }) => { xp += XP_RULES[x.kind]; });
  (h.data || []).forEach((x: { level: 'mini' | 'more' | 'max' }) => { xp += XP_RULES[x.level]; });
  (r.data || []).forEach((x: { kind: 'daily' | 'weekly' | 'monthly' }) => { xp += XP_RULES[x.kind]; });
  xp += (d.count || 0) * XP_RULES.diet;
  return xp;
}
