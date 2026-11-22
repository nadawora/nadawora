'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './supabase';
import { useWs } from './workspace';
import { todayKST } from './date';
import type { Quest, QuestTodo } from './types';

// 레벨: 퀘스트를 깨면 +2, 할 일을 체크하면 +1.
// 마비노기처럼 초반엔 금방 올라요. Lv n이 되려면 누적 n(n+1)/2 점이 필요해요 (Lv1=1, Lv2=3, Lv3=6, Lv4=10, Lv5=15 …).
// 점수는 "지금 완료 상태인 기록"으로 다시 세기 때문에, 체크와 해제를 반복해도 중복으로 쌓이지 않아요.
export const POINTS = { quest: 2, todo: 1 };
export const needFor = (lv: number) => (lv * (lv + 1)) / 2;
export function levelFor(pts: number) {
  let lv = 0;
  while (needFor(lv + 1) <= pts) lv++;
  return lv;
}

export function useBoard(date: string) {
  const { wsId, memberId, version } = useWs();
  const today = todayKST();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [todos, setTodos] = useState<QuestTodo[]>([]);
  const [points, setPoints] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [levelUp, setLevelUp] = useState(0);
  const pointsRef = useRef(0);
  const carriedFor = useRef('');
  const busy = useRef(new Set<string>());

  const flash = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); }, []);

  const countPoints = useCallback(async () => {
    const db = sb();
    const [a, b] = await Promise.all([
      db.from('quests').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('status', 'done'),
      db.from('quest_todos').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('done', true),
    ]);
    return (a.count || 0) * POINTS.quest + (b.count || 0) * POINTS.todo;
  }, [wsId]);

  const load = useCallback(async () => {
    const db = sb();
    // 지난 날짜에 못 깬 퀘스트는 오늘로 자동으로 넘어와요 (하위 할 일도 함께).
    if (date === today && carriedFor.current !== today) {
      carriedFor.current = today;
      const { data: old } = await db.from('quests').select('id, carried_count').eq('workspace_id', wsId).lt('quest_date', today).eq('status', 'open');
      for (const o of old || []) {
        await db.from('quests').update({ quest_date: today, kind: 'sub', carried_count: (o.carried_count || 0) + 1 }).eq('id', o.id).eq('status', 'open');
      }
    }
    const { data: q, error } = await db.from('quests').select('*').eq('workspace_id', wsId).eq('quest_date', date).neq('status', 'dropped').order('created_at');
    if (error) { flash('불러오지 못했어요: ' + error.message); return; }
    const ids = (q || []).map((x) => x.id);
    const t = ids.length ? (await db.from('quest_todos').select('*').in('quest_id', ids).order('sort').order('created_at')).data : [];
    const p = await countPoints();
    pointsRef.current = p;
    setQuests((q || []) as Quest[]);
    setTodos((t || []) as QuestTodo[]);
    setPoints(p);
    setLoaded(true);
  }, [wsId, date, today, countPoints, flash]);

  useEffect(() => { setLoaded(false); load(); }, [load, version]);

  // 행동 뒤에 점수를 다시 세고, 레벨이 오르면 알려요.
  const recount = useCallback(async () => {
    const before = levelFor(pointsRef.current);
    const p = await countPoints();
    pointsRef.current = p;
    setPoints(p);
    const after = levelFor(p);
    if (after > before) setLevelUp(after);
  }, [countPoints]);

  async function lock<T>(id: string, fn: () => Promise<T>) {
    if (busy.current.has(id)) return undefined;
    busy.current.add(id);
    try { return await fn(); } finally { busy.current.delete(id); }
  }

  async function addQuest(title: string) {
    const t = title.trim();
    if (!t) return null;
    const { data, error } = await sb().from('quests')
      .insert({ workspace_id: wsId, member_id: memberId, title: t, kind: 'sub', quest_date: date })
      .select('*').single();
    if (error) { flash('저장하지 못했어요: ' + error.message); return null; }
    setQuests((qs) => [...qs, data as Quest]);
    return (data as Quest).id;
  }

  async function saveQuest(id: string, patch: Partial<Pick<Quest, 'title' | 'note'>>) {
    if (patch.title !== undefined && !patch.title.trim()) return;
    setQuests((qs) => qs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await sb().from('quests').update(patch).eq('id', id);
    if (error) { flash('저장하지 못했어요: ' + error.message); load(); }
  }

  async function setDone(q: Quest, done: boolean) {
    await lock(q.id, async () => {
      setQuests((qs) => qs.map((x) => (x.id === q.id ? { ...x, status: done ? 'done' : 'open', done_at: done ? new Date().toISOString() : null } : x)));
      const { error } = await sb().from('quests').update({ status: done ? 'done' : 'open', done_at: done ? new Date().toISOString() : null }).eq('id', q.id);
      if (error) { flash('저장하지 못했어요: ' + error.message); load(); return; }
      await recount();
    });
  }

  async function dropQuest(q: Quest) {
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    const { error } = await sb().from('quests').update({ status: 'dropped' }).eq('id', q.id);
    if (error) { flash('저장하지 못했어요: ' + error.message); load(); } else flash('내려놓았어요. 필요하면 다시 적으면 돼요.');
  }

  async function removeQuest(q: Quest) {
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    setTodos((ts) => ts.filter((x) => x.quest_id !== q.id));
    const { error } = await sb().from('quests').delete().eq('id', q.id);
    if (error) { flash('삭제하지 못했어요: ' + error.message); load(); return; }
    await recount();
  }

  async function addTodo(questId: string, title: string) {
    const t = title.trim();
    if (!t) return;
    const sort = Math.max(0, ...todos.filter((x) => x.quest_id === questId).map((x) => x.sort)) + 1;
    const { data, error } = await sb().from('quest_todos').insert({ workspace_id: wsId, quest_id: questId, title: t, sort }).select('*').single();
    if (error) { flash('저장하지 못했어요: ' + error.message); return; }
    setTodos((ts) => [...ts, data as QuestTodo]);
  }

  async function toggleTodo(td: QuestTodo) {
    return lock(td.id, async () => {
      const done = !td.done;
      setTodos((ts) => ts.map((x) => (x.id === td.id ? { ...x, done } : x)));
      const { error } = await sb().from('quest_todos').update({ done }).eq('id', td.id);
      if (error) { flash('저장하지 못했어요: ' + error.message); load(); return; }
      await recount();
    });
  }

  async function renameTodo(td: QuestTodo, title: string) {
    const t = title.trim();
    if (!t || t === td.title) return;
    setTodos((ts) => ts.map((x) => (x.id === td.id ? { ...x, title: t } : x)));
    const { error } = await sb().from('quest_todos').update({ title: t }).eq('id', td.id);
    if (error) { flash('저장하지 못했어요: ' + error.message); load(); }
  }

  async function removeTodo(td: QuestTodo) {
    setTodos((ts) => ts.filter((x) => x.id !== td.id));
    const { error } = await sb().from('quest_todos').delete().eq('id', td.id);
    if (error) { flash('삭제하지 못했어요: ' + error.message); load(); return; }
    await recount();
  }

  return {
    today, quests, todos, points, loaded, msg, levelUp, clearLevelUp: () => setLevelUp(0),
    addQuest, saveQuest, setDone, dropQuest, removeQuest, addTodo, toggleTodo, renameTodo, removeTodo,
  };
}
