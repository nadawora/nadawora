'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { fmtMD } from '@/lib/date';

interface Member { id: string; kind: 'human' | 'ai'; name: string; role: string | null; color: string | null; ai_model: string | null; user_id: string | null }
interface Task { id: string; title: string; purpose: string | null; done_criteria: string | null; topic_id: string | null; assignee_id: string | null; priority: number; due_date: string | null; status: Status; result: string | null; audit_score: number | null; audit_note: string | null; cost_krw: number }
interface Decision { id: string; question: string; options: string[]; status: string; asked_by: string | null; created_at: string }
type Status = 'todo' | 'doing' | 'review' | 'done';

const COLS: { k: Status; label: string }[] = [
  { k: 'todo', label: '할 일' },
  { k: 'doing', label: '진행 중' },
  { k: 'review', label: '검토 대기' },
  { k: 'done', label: '완료 · 결과물' },
];
const blankTask = { title: '', purpose: '', done_criteria: '', topic_id: '', assignee_id: '', due_date: '', priority: 2 };

export default function TasksPage() {
  const { wsId, memberId, topics } = useWs();
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [form, setForm] = useState(blankTask);
  const [open, setOpen] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newPerson, setNewPerson] = useState('');

  const load = useCallback(async () => {
    const db = sb();
    const [m, t, d] = await Promise.all([
      db.from('members').select('id, kind, name, role, color, ai_model, user_id').eq('workspace_id', wsId).order('created_at'),
      db.from('tasks').select('*').eq('workspace_id', wsId).order('priority').order('created_at', { ascending: false }),
      db.from('decisions').select('*').eq('workspace_id', wsId).eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setMembers((m.data || []) as Member[]);
    setTasks((t.data || []) as Task[]);
    setDecisions((d.data || []) as Decision[]);
  }, [wsId]);
  useEffect(() => { load(); }, [load]);

  const mem = (id: string | null) => members.find((m) => m.id === id);
  const topic = (id: string | null) => topics.find((t) => t.id === id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await sb().from('tasks').insert({
      workspace_id: wsId, created_by: memberId, title: form.title.trim(), purpose: form.purpose || null, done_criteria: form.done_criteria || null,
      topic_id: form.topic_id || null, assignee_id: form.assignee_id || null, due_date: form.due_date || null, priority: Number(form.priority),
    });
    setForm(blankTask); setShowForm(false); load();
  }
  async function patch(id: string, p: Partial<Task>) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
    if (open?.id === id) setOpen({ ...open, ...p } as Task);
    await sb().from('tasks').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id);
  }
  async function remove(id: string) {
    await sb().from('tasks').delete().eq('id', id);
    setOpen(null); load();
  }
  async function answer(d: Decision, a: string) {
    await sb().from('decisions').update({ answer: a, status: 'answered', answered_at: new Date().toISOString() }).eq('id', d.id);
    load();
  }
  async function renameMember(m: Member, name: string) {
    if (!name.trim() || name === m.name) return;
    await sb().from('members').update({ name: name.trim() }).eq('id', m.id);
    load();
  }
  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!newPerson.trim()) return;
    await sb().from('members').insert({ workspace_id: wsId, kind: 'human', name: newPerson.trim(), role: '팀원', color: '#868E96' });
    setNewPerson(''); load();
  }

  const humans = members.filter((m) => m.kind === 'human');
  const ais = members.filter((m) => m.kind === 'ai');
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">업무를 정의하고 사람이나 AI 직원에게 맡겨요</div><h1>업무 대시보드</h1></div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>{showForm ? '닫기' : '+ 업무 만들기'}</button>
      </div>

      {decisions.length > 0 && (
        <section className="card warn">
          <div className="row"><h2>결정 대기 {decisions.length}건</h2><span className="mut">슬랙으로도 알려 드려요</span></div>
          {decisions.map((d) => (
            <div key={d.id} className="stack" style={{ gap: 6, borderTop: '1px solid #FFE0BF', paddingTop: 10 }}>
              <div><b>{mem(d.asked_by)?.name || '직원'}:</b> {d.question}</div>
              <div className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                {(d.options || []).map((o) => <button key={o} className="btn sm" onClick={() => answer(d, o)}>{o}</button>)}
              </div>
            </div>
          ))}
        </section>
      )}

      {showForm && (
        <form className="card" onSubmit={create}>
          <h2>새 업무</h2>
          <label className="f">업무 이름<input className="in" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 이번 주 블로그 초안 2편" required /></label>
          <label className="f">목적<input className="in" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="왜 하는 일인가요?" /></label>
          <label className="f">완료 기준<textarea className="in" rows={2} value={form.done_criteria} onChange={(e) => setForm({ ...form, done_criteria: e.target.value })} placeholder="예: 각 1,500자 이상, 출처 표시" /></label>
          <div className="grid3" style={{ gap: 8 }}>
            <label className="f">담당자
              <select className="in" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">아직 안 정함</option>
                <optgroup label="사람">{humans.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
                <optgroup label="AI 직원">{ais.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.ai_model === 'gpt' ? 'GPT' : 'Claude'})</option>)}</optgroup>
              </select>
            </label>
            <label className="f">주제
              <select className="in" value={form.topic_id} onChange={(e) => setForm({ ...form, topic_id: e.target.value })}>
                <option value="">없음</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="f">마감일<input type="date" className="in" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
            <label className="f">우선순위
              <select className="in" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
                <option value={1}>높음</option><option value={2}>보통</option><option value={3}>낮음</option>
              </select>
            </label>
          </div>
          <button className="btn" style={{ alignSelf: 'flex-start' }}>업무 만들기</button>
        </form>
      )}

      <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', alignItems: 'start' }}>
        {COLS.map((c) => {
          const list = tasks.filter((t) => t.status === c.k);
          return (
            <section key={c.k} className="card flat" style={{ gap: 10, padding: 14 }}>
              <div className="row"><b>{c.label}</b><span className="mut">{list.length}</span></div>
              {list.length === 0 && <div className="mut" style={{ textAlign: 'center', padding: 8 }}>비어 있어요</div>}
              {list.map((t) => {
                const a = mem(t.assignee_id); const tp = topic(t.topic_id);
                return (
                  <button key={t.id} className="card" style={{ padding: 12, gap: 6, border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpen(t)}>
                    <b style={{ fontSize: 14 }}>{t.priority === 1 && <span style={{ color: '#C92A2A' }}>● </span>}{t.title}</b>
                    <span className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                      <span className="dot" style={{ background: a?.color || '#CED4DA' }} />
                      <span className="mut">{a ? a.name + (a.kind === 'ai' ? ' · AI' : '') : '담당자 없음'}</span>
                    </span>
                    <span className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                      {tp && <span className="pill">{tp.name}</span>}
                      {t.due_date && <span className="pill">~{fmtMD(t.due_date)}</span>}
                      {t.audit_score != null && <span className="pill">감사 {t.audit_score}점</span>}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
      <div className="mut">이번까지 완료한 업무 {doneCount}개</div>

      <section className="card">
        <h2>구성원</h2>
        <div className="mut">이름을 눌러 바꿀 수 있어요. 사람 담당자는 이름만 먼저 넣고, 나중에 초대 기능으로 계정을 연결해요.</div>
        <div className="grid3" style={{ gap: 8 }}>
          {members.map((m) => (
            <label key={m.id} className="card flat" style={{ padding: 12, gap: 6 }}>
              <span className="row" style={{ justifyContent: 'flex-start', gap: 6 }}><span className="dot" style={{ background: m.color || '#868E96' }} /><span className="mut">{m.kind === 'ai' ? `AI · ${m.role} · ${m.ai_model === 'gpt' ? 'GPT' : 'Claude'}` : m.user_id ? '사람 · 나' : '사람'}</span></span>
              <input className="in" defaultValue={m.name} onBlur={(e) => renameMember(m, e.target.value)} aria-label={m.role + ' 이름'} />
            </label>
          ))}
        </div>
        <form className="row" onSubmit={addPerson}>
          <input className="in" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} placeholder="사람 담당자 추가 (이름)" aria-label="사람 담당자 이름" />
          <button className="btn">추가</button>
        </form>
      </section>

      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="card modal" role="dialog" aria-modal="true" aria-labelledby="task-t" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row"><h2 id="task-t">{open.title}</h2><button className="x" onClick={() => setOpen(null)}>닫기</button></div>
            {open.purpose && <div><b>목적</b><div>{open.purpose}</div></div>}
            {open.done_criteria && <div><b>완료 기준</b><div style={{ whiteSpace: 'pre-wrap' }}>{open.done_criteria}</div></div>}
            <label className="f">담당자
              <select className="in" value={open.assignee_id || ''} onChange={(e) => patch(open.id, { assignee_id: e.target.value || null })}>
                <option value="">아직 안 정함</option>
                <optgroup label="사람">{humans.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
                <optgroup label="AI 직원">{ais.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
              </select>
            </label>
            <div className="tabs" role="group" aria-label="상태">
              {COLS.map((c) => <button key={c.k} className={'tab' + (open.status === c.k ? ' on' : '')} onClick={() => patch(open.id, { status: c.k })}>{c.label}</button>)}
            </div>
            <label className="f">결과물<textarea className="in" rows={5} defaultValue={open.result || ''} onBlur={(e) => patch(open.id, { result: e.target.value })} placeholder="결과물이나 링크를 남겨 두세요" /></label>
            <div className="grid3" style={{ gridTemplateColumns: '120px 1fr', gap: 8 }}>
              <label className="f">감사 점수<input className="in" inputMode="numeric" defaultValue={open.audit_score ?? ''} onBlur={(e) => patch(open.id, { audit_score: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className="f">감사 의견<input className="in" defaultValue={open.audit_note || ''} onBlur={(e) => patch(open.id, { audit_note: e.target.value })} /></label>
            </div>
            <div className="row"><span className="mut">AI 비용 {open.cost_krw.toLocaleString()}원</span><button className="btn ghost sm" onClick={() => remove(open.id)}>업무 삭제</button></div>
          </div>
        </div>
      )}
    </>
  );
}
