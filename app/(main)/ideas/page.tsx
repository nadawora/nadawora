'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST } from '@/lib/date';
import type { Idea } from '@/lib/types';

const STATUS: Record<Idea['status'], string> = { inbox: '새 아이디어', doing: '진행 중', kept: '보관', dropped: '버림' };

export default function IdeasPage() {
  const { wsId, memberId, topics, version, bump } = useWs();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState<Idea['status'] | 'all'>('all');
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');
  const [body, setBody] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await sb().from('ideas').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(500);
    setIdeas((data || []) as Idea[]);
  }, [wsId]);
  useEffect(() => { load(); }, [load, version]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await sb().from('ideas').insert({ workspace_id: wsId, member_id: memberId, body: body.trim(), topic_id: newTopic || null });
    setBody(''); load();
  }
  async function setStatus(i: Idea, status: Idea['status']) {
    setIdeas((xs) => xs.map((x) => (x.id === i.id ? { ...x, status } : x)));
    await sb().from('ideas').update({ status }).eq('id', i.id);
  }
  async function toQuest(i: Idea) {
    await sb().from('quests').insert({ workspace_id: wsId, member_id: memberId, title: i.body.slice(0, 80), kind: 'sub', quest_date: todayKST(), topic_id: i.topic_id });
    await setStatus(i, 'doing');
    setMsg('오늘의 서브 퀘스트로 보냈어요'); setTimeout(() => setMsg(''), 2200);
    bump();
  }
  async function del(i: Idea) {
    await sb().from('ideas').delete().eq('id', i.id);
    load();
  }

  const list = ideas.filter((i) => (filter === 'all' ? i.status !== 'dropped' : i.status === filter) && (!topic || i.topic_id === topic) && (!q || i.body.includes(q)));
  const tname = (id: string | null) => topics.find((t) => t.id === id);

  return (
    <>
      <div><div className="mut">생각나면 일단 던져 두고, 주간 회고 때 꺼내 쓰기</div><h1>아이디어 보관함</h1></div>

      <form className="card" onSubmit={add}>
        <label className="sr" htmlFor="idea-body">새 아이디어</label>
        <textarea id="idea-body" className="in" rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="떠오른 생각을 적어 주세요" />
        <div className="row wrap">
          <select className="in" style={{ width: 200 }} value={newTopic} onChange={(e) => setNewTopic(e.target.value)} aria-label="주제">
            <option value="">주제 없음</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn" disabled={!body.trim()}>보관함에 넣기</button>
        </div>
      </form>

      <div className="row wrap">
        <div className="tabs">
          {(['all', 'inbox', 'doing', 'kept', 'dropped'] as const).map((s) => (
            <button key={s} className={'tab' + (filter === s ? ' on' : '')} onClick={() => setFilter(s)}>{s === 'all' ? '전체' : STATUS[s]}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <select className="in" style={{ width: 150 }} value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="주제로 거르기">
            <option value="">모든 주제</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className="in" style={{ width: 180 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색" aria-label="검색" />
        </div>
      </div>
      {msg && <div className="toast" role="status">{msg}</div>}

      <div className="stack">
        {list.length === 0 && <div className="card"><div className="empty">{ideas.length ? '조건에 맞는 아이디어가 없어요.' : '아직 아이디어가 없어요. 오른쪽 아래 + 버튼으로 언제든 적을 수 있어요.'}</div></div>}
        {list.map((i) => {
          const t = tname(i.topic_id);
          return (
            <article key={i.id} className="card" style={{ gap: 8 }}>
              <div className="row wrap">
                <span className="row" style={{ gap: 6, justifyContent: 'flex-start' }}>
                  <span className="pill">{STATUS[i.status]}</span>
                  {t && <span className="pill" style={{ background: '#fff', border: `1px solid ${t.color}`, color: t.color }}>{t.name}</span>}
                  <span className="mut">{new Date(i.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })}</span>
                </span>
                <button className="x" onClick={() => del(i)} aria-label="삭제">삭제</button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>{i.body}</div>
              <div className="row wrap" style={{ justifyContent: 'flex-start', gap: 6 }}>
                <button className="btn sm" onClick={() => toQuest(i)}>오늘 퀘스트로</button>
                {i.status !== 'kept' && <button className="btn ghost sm" onClick={() => setStatus(i, 'kept')}>보관</button>}
                {i.status !== 'inbox' && <button className="btn ghost sm" onClick={() => setStatus(i, 'inbox')}>새 아이디어로</button>}
                {i.status !== 'dropped' && <button className="btn ghost sm" onClick={() => setStatus(i, 'dropped')}>버리기</button>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
