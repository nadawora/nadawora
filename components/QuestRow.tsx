'use client';
import { useState } from 'react';
import { XP_RULES } from '@/lib/xp';
import type { Quest } from '@/lib/types';

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

interface Props {
  q: Quest;
  onToggle: (q: Quest) => void;
  onRename?: (q: Quest, title: string) => void;
  onRemove?: (q: Quest) => void;
  onMakeMain?: (q: Quest) => void;
  compact?: boolean;
}

// 퀘스트 한 줄: 체크하면 통통 튀는 효과와 +XP가 떠올라요. 제목을 누르면 바로 고칠 수 있어요.
export default function QuestRow({ q, onToggle, onRename, onRemove, onMakeMain, compact }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.title);
  const [pop, setPop] = useState(0);
  const done = q.status === 'done';

  function toggle() {
    if (!done) setPop(Date.now());
    onToggle(q);
  }
  function save() {
    setEditing(false);
    if (onRename && text.trim() && text.trim() !== q.title) onRename(q, text);
    else setText(q.title);
  }

  return (
    <div className={'q' + (done ? ' done' : '') + (compact ? ' compact' : '')} data-testid="quest-row">
      <span className="ckwrap">
        <button className={'ck' + (done ? ' on' : '')} onClick={toggle} aria-pressed={done} aria-label={q.title + (done ? ' 완료 취소' : ' 완료')}>{done && <Check />}</button>
        {pop > 0 && done && <span key={pop} className="xp-pop" aria-hidden="true">+{XP_RULES[q.kind]} XP</span>}
      </span>
      {editing ? (
        <input
          className="in qedit" autoFocus value={text} aria-label="퀘스트 이름 고치기"
          onChange={(e) => setText(e.target.value)} onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setText(q.title); setEditing(false); } }}
        />
      ) : (
        <button className="t" onClick={() => { if (onRename) { setText(q.title); setEditing(true); } else toggle(); }} title={onRename ? '눌러서 고치기' : undefined}>
          {q.title}{q.carried_count > 0 && <span className="mut"> · {q.carried_count}번 넘김</span>}
        </button>
      )}
      {!editing && onMakeMain && q.kind === 'sub' && <button className="x" onClick={() => onMakeMain(q)} aria-label={q.title + ' 메인으로 정하기'}>메인으로</button>}
      {!editing && onRemove && <button className="x" onClick={() => { if (confirm(`"${q.title}" 퀘스트를 지울까요?`)) onRemove(q); }} aria-label={q.title + ' 삭제'}>삭제</button>}
    </div>
  );
}
