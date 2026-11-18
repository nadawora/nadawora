'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import type { Goal, Habit } from '@/lib/types';

const HORIZON: Record<Goal['horizon'], string> = { dream: '꿈', year: '올해', month: '이번 달' };

export default function GoalsPage() {
  const { wsId, memberId, topics, reloadTopics } = useWs();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newGoal, setNewGoal] = useState<{ topic: string; title: string; horizon: Goal['horizon'] }>({ topic: '', title: '', horizon: 'year' });
  const [newHabit, setNewHabit] = useState({ title: '', topic: '', mini: '', more: '', max: '' });
  const [newTopic, setNewTopic] = useState('');
  const [edit, setEdit] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = sb();
    const [g, h] = await Promise.all([
      db.from('goals').select('*').eq('workspace_id', wsId).order('created_at'),
      db.from('habits').select('*').eq('workspace_id', wsId).order('sort'),
    ]);
    setGoals((g.data || []) as Goal[]);
    setHabits((h.data || []) as Habit[]);
  }, [wsId]);
  useEffect(() => { load(); }, [load]);

  async function addGoal(topicId: string) {
    const title = newGoal.topic === topicId ? newGoal.title.trim() : '';
    if (!title) return;
    await sb().from('goals').insert({ workspace_id: wsId, topic_id: topicId, title, horizon: newGoal.horizon });
    setNewGoal({ topic: '', title: '', horizon: 'year' });
    load();
  }
  async function patchGoal(id: string, patch: Partial<Goal>) {
    setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    await sb().from('goals').update(patch).eq('id', id);
  }
  async function delGoal(id: string) {
    await sb().from('goals').delete().eq('id', id);
    load();
  }
  async function addTopic() {
    if (!newTopic.trim()) return;
    await sb().from('topics').insert({ workspace_id: wsId, name: newTopic.trim(), sort: topics.length + 1 });
    setNewTopic('');
    reloadTopics();
  }
  async function addHabit() {
    const h = newHabit;
    if (!h.title.trim() || !h.mini.trim() || !h.more.trim() || !h.max.trim()) return;
    await sb().from('habits').insert({ workspace_id: wsId, member_id: memberId, topic_id: h.topic || null, title: h.title.trim(), mini: h.mini.trim(), more: h.more.trim(), max: h.max.trim(), sort: habits.length + 1 });
    setNewHabit({ title: '', topic: '', mini: '', more: '', max: '' });
    load();
  }
  async function patchHabit(id: string, patch: Partial<Habit>) {
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    await sb().from('habits').update(patch).eq('id', id);
  }

  return (
    <>
      <div><div className="mut">꿈 → 주제 → 목표 → 습관·퀘스트</div><h1>목표 · 습관</h1></div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        {topics.map((t) => {
          const list = goals.filter((g) => g.topic_id === t.id);
          return (
            <section key={t.id} className="card">
              <div className="row"><h2 className="row" style={{ gap: 8, justifyContent: 'flex-start' }}><span className="dot" style={{ background: t.color }} />{t.name}</h2><span className="mut">목표 {list.length}개</span></div>
              {list.length === 0 && <div className="empty">아직 목표가 없어요.</div>}
              {list.map((g) => (
                <div key={g.id} className="stack" style={{ gap: 6, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  <div className="row">
                    <span><span className="pill">{HORIZON[g.horizon]}</span> <b style={{ textDecoration: g.status === 'done' ? 'line-through' : 'none' }}>{g.title}</b></span>
                    <span className="row" style={{ gap: 4 }}>
                      <button className="x" onClick={() => patchGoal(g.id, { status: g.status === 'done' ? 'active' : 'done', progress: g.status === 'done' ? g.progress : 100 })}>{g.status === 'done' ? '되돌리기' : '달성'}</button>
                      <button className="x" onClick={() => delGoal(g.id)} aria-label={g.title + ' 삭제'}>삭제</button>
                    </span>
                  </div>
                  <label className="row" style={{ gap: 10 }}>
                    <span className="sr">{g.title} 진행률</span>
                    <input type="range" min={0} max={100} step={5} value={g.progress} onChange={(e) => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, progress: Number(e.target.value) } : x)))} onMouseUp={(e) => patchGoal(g.id, { progress: Number((e.target as HTMLInputElement).value) })} onTouchEnd={(e) => patchGoal(g.id, { progress: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => patchGoal(g.id, { progress: Number((e.target as HTMLInputElement).value) })} style={{ flex: 1 }} />
                    <b style={{ width: 44, textAlign: 'right' }}>{g.progress}%</b>
                  </label>
                </div>
              ))}
              <form className="row wrap" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); addGoal(t.id); }}>
                <select className="in" style={{ width: 96 }} value={newGoal.topic === t.id ? newGoal.horizon : 'year'} onChange={(e) => setNewGoal({ topic: t.id, title: newGoal.topic === t.id ? newGoal.title : '', horizon: e.target.value as Goal['horizon'] })} aria-label="목표 기간">
                  <option value="dream">꿈</option><option value="year">올해</option><option value="month">이번 달</option>
                </select>
                <input className="in" style={{ flex: 1 }} placeholder="+ 목표 추가" value={newGoal.topic === t.id ? newGoal.title : ''} onChange={(e) => setNewGoal({ topic: t.id, title: e.target.value, horizon: newGoal.topic === t.id ? newGoal.horizon : 'year' })} aria-label={t.name + ' 목표 추가'} />
                <button className="btn sm">추가</button>
              </form>
            </section>
          );
        })}
        <section className="card flat">
          <h2>주제 추가</h2>
          <form className="row" onSubmit={(e) => { e.preventDefault(); addTopic(); }}>
            <input className="in" placeholder="예: 가족, 돈 관리" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} aria-label="새 주제 이름" />
            <button className="btn">추가</button>
          </form>
        </section>
      </div>

      <section className="card">
        <div className="row"><h2>습관 (Mini · More · Max)</h2><span className="mut">힘든 날엔 Mini만 해도 성공</span></div>
        {habits.map((h) => (
          <div key={h.id} className="habit" style={{ opacity: h.active ? 1 : 0.55 }}>
            {edit === h.id ? (
              <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                <input className="in" defaultValue={h.title} onBlur={(e) => patchHabit(h.id, { title: e.target.value })} aria-label="습관 이름" />
                <input className="in" defaultValue={h.mini} onBlur={(e) => patchHabit(h.id, { mini: e.target.value })} aria-label="Mini" />
                <input className="in" defaultValue={h.more} onBlur={(e) => patchHabit(h.id, { more: e.target.value })} aria-label="More" />
                <input className="in" defaultValue={h.max} onBlur={(e) => patchHabit(h.id, { max: e.target.value })} aria-label="Max" />
                <button className="btn sm" onClick={() => setEdit(null)}>완료</button>
              </div>
            ) : (
              <div className="row wrap">
                <span><b>{h.title}</b> <span className="mut">Mini {h.mini} · More {h.more} · Max {h.max}</span></span>
                <span className="row" style={{ gap: 4 }}>
                  <button className="x" onClick={() => setEdit(h.id)}>고치기</button>
                  <button className="x" onClick={() => patchHabit(h.id, { active: !h.active })}>{h.active ? '쉬기' : '다시 하기'}</button>
                </span>
              </div>
            )}
          </div>
        ))}
        <form className="card flat" onSubmit={(e) => { e.preventDefault(); addHabit(); }}>
          <b>새 습관</b>
          <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <input className="in" placeholder="습관 이름 (예: 스트레칭)" value={newHabit.title} onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })} aria-label="습관 이름" />
            <select className="in" value={newHabit.topic} onChange={(e) => setNewHabit({ ...newHabit, topic: e.target.value })} aria-label="주제">
              <option value="">주제 없음</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input className="in" placeholder="Mini (예: 1분)" value={newHabit.mini} onChange={(e) => setNewHabit({ ...newHabit, mini: e.target.value })} aria-label="Mini" />
            <input className="in" placeholder="More (예: 10분)" value={newHabit.more} onChange={(e) => setNewHabit({ ...newHabit, more: e.target.value })} aria-label="More" />
            <input className="in" placeholder="Max (예: 30분)" value={newHabit.max} onChange={(e) => setNewHabit({ ...newHabit, max: e.target.value })} aria-label="Max" />
          </div>
          <button className="btn" style={{ alignSelf: 'flex-start' }}>습관 추가</button>
        </form>
      </section>
    </>
  );
}
