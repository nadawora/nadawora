'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './supabase';
import { useWs } from './workspace';
import { todayKST } from './date';
import { levelOf, totalXp, XP_RULES } from './xp';
import type { Quest } from './types';

// 하루치 퀘스트를 불러오고 바꾸는 공통 기능. 오늘 화면과 나다움오피 패널이 함께 써요.
// 경험치는 "지금 완료 상태인 퀘스트" 기준으로 다시 계산하므로, 완료와 취소를 반복해도 중복으로 쌓이지 않아요.
export function useQuestDay(date: string) {
  const { wsId, memberId, version } = useWs();
  const today = todayKST();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [overdue, setOverdue] = useState<Quest[]>([]);
  const [xp, setXp] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [levelUp, setLevelUp] = useState(0);
  const busy = useRef(new Set<string>());

  const load = useCallback(async () => {
    const db = sb();
    const [q, od, x] = await Promise.all([
      db.from('quests').select('*').eq('workspace_id', wsId).eq('quest_date', date).neq('status', 'dropped').order('created_at'),
      date === today
        ? db.from('quests').select('*').eq('workspace_id', wsId).lt('quest_date', today).eq('status', 'open').order('quest_date')
        : Promise.resolve({ data: [] as Quest[] }),
      totalXp(wsId),
    ]);
    setQuests((q.data || []) as Quest[]);
    setOverdue((od.data || []) as Quest[]);
    setXp(x);
    setLoaded(true);
  }, [wsId, date, today]);

  useEffect(() => { setLoaded(false); load(); }, [load, version]);

  const flash = (msg: string) => { setError(msg); setTimeout(() => setError(''), 3500); };
  const main = quests.find((q) => q.kind === 'main');
  const subs = quests.filter((q) => q.kind === 'sub');

  async function add(kind: 'main' | 'sub', title: string) {
    const t = title.trim();
    if (!t) return false;
    if (kind === 'main' && main) { flash('메인 퀘스트는 하루에 하나만 정할 수 있어요.'); return false; }
    const { error: e } = await sb().from('quests').insert({ workspace_id: wsId, member_id: memberId, title: t, kind, quest_date: date });
    if (e) { flash(e.code === '23505' ? '메인 퀘스트는 하루에 하나만 정할 수 있어요.' : '저장하지 못했어요: ' + e.message); return false; }
    await load();
    return true;
  }

  async function rename(q: Quest, title: string) {
    const t = title.trim();
    if (!t || t === q.title) return;
    setQuests((qs) => qs.map((x) => (x.id === q.id ? { ...x, title: t } : x)));
    const { error: e } = await sb().from('quests').update({ title: t }).eq('id', q.id);
    if (e) { flash('수정하지 못했어요: ' + e.message); load(); }
  }

  async function remove(q: Quest) {
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    if (q.status === 'done') setXp((v) => Math.max(0, v - XP_RULES[q.kind]));
    const { error: e } = await sb().from('quests').delete().eq('id', q.id);
    if (e) flash('삭제하지 못했어요: ' + e.message);
    load();
  }

  // 완료 ↔ 완료 취소. 같은 퀘스트의 요청이 끝나기 전에는 다시 누르지 못하게 막아 순서가 꼬이지 않게 해요.
  async function toggle(q: Quest) {
    if (busy.current.has(q.id)) return;
    busy.current.add(q.id);
    const done = q.status !== 'done';
    const before = levelOf(xp).level;
    const nextXp = Math.max(0, xp + (done ? 1 : -1) * XP_RULES[q.kind]);
    setQuests((qs) => qs.map((x) => (x.id === q.id ? { ...x, status: done ? 'done' : 'open', done_at: done ? new Date().toISOString() : null } : x)));
    setXp(nextXp);
    if (done && levelOf(nextXp).level > before) setLevelUp(levelOf(nextXp).level);
    const { error: e } = await sb().from('quests').update({ status: done ? 'done' : 'open', done_at: done ? new Date().toISOString() : null }).eq('id', q.id);
    busy.current.delete(q.id);
    if (e) { flash('저장하지 못했어요: ' + e.message); load(); return; }
    setXp(await totalXp(wsId));
  }

  async function makeMain(q: Quest) {
    if (q.kind === 'main') return;
    const db = sb();
    if (main) {
      const r = await db.from('quests').update({ kind: 'sub' }).eq('id', main.id);
      if (r.error) { flash('바꾸지 못했어요: ' + r.error.message); return; }
    }
    const { error: e } = await db.from('quests').update({ kind: 'main' }).eq('id', q.id);
    if (e) flash('바꾸지 못했어요: ' + e.message);
    load();
  }

  // 지난 날짜의 미완료 퀘스트를 오늘로 옮겨요. 오늘 메인이 이미 있으면 서브로 들어가요.
  async function carry(list: Quest[]) {
    const db = sb();
    let hasMain = !!(await db.from('quests').select('id').eq('workspace_id', wsId).eq('quest_date', today).eq('kind', 'main').neq('status', 'dropped').maybeSingle()).data;
    for (const q of list) {
      const kind = q.kind === 'main' && !hasMain ? 'main' : 'sub';
      if (kind === 'main') hasMain = true;
      const { error: e } = await db.from('quests').update({ quest_date: today, kind, carried_count: q.carried_count + 1 }).eq('id', q.id);
      if (e) { flash('옮기지 못했어요: ' + e.message); break; }
    }
    load();
  }

  async function drop(q: Quest) {
    await sb().from('quests').update({ status: 'dropped' }).eq('id', q.id);
    load();
  }

  const total = quests.length;
  const doneCount = quests.filter((q) => q.status === 'done').length;
  const rate = total ? Math.round((doneCount / total) * 100) : 0;

  return {
    today, quests, main, subs, overdue, xp, level: levelOf(xp), loaded, error,
    total, doneCount, rate, levelUp, clearLevelUp: () => setLevelUp(0),
    add, rename, remove, toggle, makeMain, carry, drop, reload: load,
  };
}
