'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';

export default function IdeaFab() {
  const { wsId, memberId, topics, bump } = useWs();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  async function save() {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await sb().from('ideas').insert({ workspace_id: wsId, member_id: memberId, body: body.trim(), topic_id: topic || null });
    setBusy(false);
    if (error) { setToast('저장하지 못했어요: ' + error.message); return; }
    setBody(''); setTopic(''); setOpen(false); bump();
    setToast('아이디어 보관함에 넣었어요');
    setTimeout(() => setToast(''), 2200);
  }

  return (
    <>
      <button className="btn fab" onClick={() => setOpen(true)} aria-label="아이디어 기록하기">+ 아이디어</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="card modal" role="dialog" aria-modal="true" aria-labelledby="idea-title">
            <div className="row"><h2 id="idea-title">떠오른 아이디어</h2><button className="x" onClick={() => setOpen(false)} aria-label="닫기">닫기</button></div>
            <textarea className="in" rows={4} autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder="생각나는 대로 한 줄이면 충분해요" />
            <label className="f">주제 (선택)
              <select className="in" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="">주제 없음</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <button className="btn" disabled={busy || !body.trim()} onClick={save}>보관함에 넣기</button>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
