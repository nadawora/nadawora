'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';

interface Member { id: string; name: string; role: string | null; color: string | null; ai_model: string | null }
interface Task { id: string; title: string; status: string; assignee_id: string | null }

export default function OfficePage() {
  const { wsId } = useWs();
  const wrap = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const office = useRef<{ update: (s: unknown[], m: boolean, r: boolean) => void; dispose: () => void } | null>(null);
  const [ai, setAi] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meeting, setMeeting] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const db = sb();
    const [m, t] = await Promise.all([
      db.from('members').select('id, name, role, color, ai_model').eq('workspace_id', wsId).eq('kind', 'ai').order('created_at'),
      db.from('tasks').select('id, title, status, assignee_id').eq('workspace_id', wsId).in('status', ['doing', 'review']),
    ]);
    setAi((m.data || []) as Member[]);
    setTasks((t.data || []) as Task[]);
  }, [wsId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    import('@/lib/office3d').then(({ mountOffice }) => {
      if (!alive || !wrap.current || !overlay.current) return;
      try { office.current = mountOffice(wrap.current, overlay.current); } catch (e) { setErr('이 기기에서는 3D 화면을 그릴 수 없어요: ' + String(e)); }
    });
    return () => { alive = false; office.current?.dispose(); office.current = null; };
  }, []);

  const staff = ai.slice(0, 5).map((m) => {
    const doing = tasks.find((t) => t.assignee_id === m.id && t.status === 'doing');
    return { name: m.name, color: m.color || '#495057', busy: doing ? doing.title : null, id: m.id, model: m.ai_model };
  });
  const hasReview = tasks.some((t) => t.status === 'review');

  useEffect(() => {
    office.current?.update(staff, meeting, hasReview);
  });

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">일이 있으면 자리에서, 없으면 카페테리아에서 쉬어요</div><h1>minadaum 오피스</h1></div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn dark" onClick={() => setMeeting((v) => !v)}>{meeting ? '회의 끝내기' : '회의 소집'}</button>
          <Link className="btn" href="/tasks">업무 만들기</Link>
        </div>
      </div>
      {err && <div className="card warn">{err}</div>}
      <div ref={wrap} className="stage3d"><div ref={overlay} className="labels3d" /></div>
      <section className="card">
        <div className="row"><h2>직원 현황</h2><span className="pill" style={{ background: 'var(--green-s)', color: 'var(--green)' }}>실시간</span></div>
        {staff.map((s) => (
          <div key={s.id} className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <span className="row" style={{ gap: 10, justifyContent: 'flex-start' }}><span className="dot" style={{ background: s.color, width: 14, height: 14 }} /><b>{s.name}</b><span className="mut">{s.model === 'gpt' ? 'GPT' : 'Claude'}</span></span>
            <span className={'pill'} style={s.busy ? { background: 'var(--blue-s)', color: 'var(--blue-d)' } : meeting ? { background: 'var(--green-s)', color: 'var(--green)' } : { background: 'var(--orange-s)', color: 'var(--orange)' }}>{meeting ? '회의실' : s.busy ? '작업 중: ' + s.busy : '카페테리아에서 쉬는 중'}</span>
          </div>
        ))}
        <div className="mut">AI 직원이 실제로 일하는 기능은 Claude·OpenAI API 키를 연결하면 켜져요. 지금은 업무 대시보드에서 업무를 "진행 중"으로 바꾸면 담당 직원이 자리로 가서 일하는 모습으로 바뀌어요.</div>
      </section>
    </>
  );
}
