'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuestDay } from '@/lib/quests';
import { todayKST } from '@/lib/date';
import QuestRow from './QuestRow';

// 나다움오피 오른쪽 아래에 떠 있는 게임형 "오늘의 퀘스트" 창.
export default function QuestPanel() {
  const day = useQuestDay(todayKST());
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!day.levelUp) return;
    const t = setTimeout(day.clearLevelUp, 2600);
    return () => clearTimeout(t);
  }, [day.levelUp, day.clearLevelUp]);

  const list = [...(day.main ? [day.main] : []), ...day.subs];

  return (
    <aside className={'qpanel' + (open ? '' : ' closed')} aria-label="오늘의 퀘스트">
      <button className="qpanel-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="qp-title">오늘의 퀘스트</span>
        <span className="qp-count" data-testid="panel-count">{day.doneCount}/{day.total}</span>
        <span className="qp-lv">Lv.{day.level.level}</span>
        <span className="qp-caret" aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="qpanel-body">
          <div className="bar xpbar" aria-label={`경험치 ${day.level.inLevel} / ${day.level.need}`}><i style={{ width: day.level.pct + '%' }} /></div>
          {day.levelUp > 0 && <div className="levelup sm" role="status">레벨 업! Lv.{day.levelUp}</div>}
          {day.error && <div className="mut" role="alert">{day.error}</div>}
          {!day.loaded ? <div className="mut">불러오는 중…</div> : list.length === 0 ? (
            <div className="empty">오늘 퀘스트가 아직 없어요.</div>
          ) : (
            <div className="qp-list">
              {list.map((q) => (
                <div key={q.id} className={q.kind === 'main' ? 'qp-main' : ''}>
                  {q.kind === 'main' && <span className="qp-tag">메인</span>}
                  <QuestRow q={q} onToggle={day.toggle} compact />
                </div>
              ))}
            </div>
          )}
          <form className="row" onSubmit={async (e) => { e.preventDefault(); if (await day.add(day.main ? 'sub' : 'main', text)) setText(''); }}>
            <label className="sr" htmlFor="qp-add">퀘스트 추가</label>
            <input id="qp-add" className="in" value={text} onChange={(e) => setText(e.target.value)} placeholder={day.main ? '+ 서브 퀘스트' : '+ 오늘의 메인 퀘스트'} />
            <button className="btn sm" disabled={!text.trim()}>추가</button>
          </form>
          <Link className="mut" href="/" style={{ fontSize: 12 }}>오늘 화면에서 자세히</Link>
        </div>
      )}
    </aside>
  );
}
