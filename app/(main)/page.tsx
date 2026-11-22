'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useBoard, levelFor, needFor, POINTS } from '@/lib/board';
import { addDays, fmtLong, todayKST } from '@/lib/date';
import type { Quest, QuestTodo } from '@/lib/types';

// 오늘의 퀘스트 보드 (0단계): 퀘스트 등록 → 상세 설명·할 일 목록 → 깨기 → '깬 퀘스트' 상자로.
// 못 깬 퀘스트는 다음 날 자동으로 넘어오고, 퀘스트와 할 일을 끝낼 때마다 레벨이 올라요.
export default function QuestBoardPage() {
  const [date, setDate] = useState(() => todayKST());
  const b = useBoard(date);
  const [title, setTitle] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  const open = b.quests.filter((q) => q.status === 'open');
  const done = b.quests.filter((q) => q.status === 'done');
  const future = date > b.today;
  const headline = !b.loaded ? '불러오는 중…'
    : open.length > 0 ? `남은 퀘스트 ${open.length}개`
    : done.length > 0 ? '퀘스트를 모두 깼어요!'
    : future ? '이날 할 퀘스트를 미리 적어 두세요'
    : '오늘의 퀘스트를 적어 볼까요?';

  async function add(e: FormEvent) {
    e.preventDefault();
    const id = await b.addQuest(title);
    if (id) { setTitle(''); setOpenId(id); }
  }

  return (
    <div className="qb">
      <div className="qb-top">
        <nav className="qb-date" aria-label="날짜 이동">
          <button className="qb-nav" onClick={() => setDate(addDays(date, -1))} aria-label="하루 전">‹</button>
          <span className="qb-day">{fmtLong(date)}</span>
          <button className="qb-nav" onClick={() => setDate(addDays(date, 1))} aria-label="하루 뒤">›</button>
          {date === b.today ? <span className="qb-tag">오늘</span> : <button className="qb-link" onClick={() => setDate(b.today)}>오늘로</button>}
        </nav>
        <LevelBadge points={b.points} />
      </div>

      <h1 className="qb-title" data-testid="headline">{headline}</h1>

      <form className="qb-add" onSubmit={add}>
        <label className="sr" htmlFor="new-quest">새 퀘스트</label>
        <input id="new-quest" ref={addRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="새 퀘스트 적기 (예: 이력서 1곳 제출하기)" autoComplete="off" />
        <button type="submit" disabled={!title.trim()}>추가</button>
      </form>

      {b.loaded && open.length === 0 && done.length === 0 && (
        <p className="qb-empty">퀘스트는 오늘 끝내고 싶은 일 하나예요. 적고 나서 누르면 상세 설명과 할 일 목록을 붙일 수 있어요.</p>
      )}

      <ul className="qb-list" aria-label="남은 퀘스트">
        {open.map((q) => (
          <QuestCard key={q.id} q={q} todos={b.todos.filter((t) => t.quest_id === q.id)} expanded={openId === q.id}
            onToggle={() => setOpenId(openId === q.id ? null : q.id)} b={b} />
        ))}
      </ul>

      {done.length > 0 && (
        <details className="qb-done">
          <summary><span className="qb-done-ic" aria-hidden="true">✦</span> 깬 퀘스트 <b data-testid="done-count">{done.length}</b>개</summary>
          <ul>
            {done.map((q) => {
              const ts = b.todos.filter((t) => t.quest_id === q.id);
              return (
                <li key={q.id}>
                  <span className="qb-done-t">{q.title}</span>
                  {ts.length > 0 && <span className="qb-mut">할 일 {ts.filter((t) => t.done).length}/{ts.length}</span>}
                  <button className="qb-link" onClick={() => b.setDone(q, false)}>되돌리기</button>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {b.msg && <div className="toast" role="status">{b.msg}</div>}
      {b.levelUp > 0 && <LevelUp lv={b.levelUp} onClose={b.clearLevelUp} />}
    </div>
  );
}

type Board = ReturnType<typeof useBoard>;

function QuestCard({ q, todos, expanded, onToggle, b }: { q: Quest; todos: QuestTodo[]; expanded: boolean; onToggle: () => void; b: Board }) {
  const [title, setTitle] = useState(q.title);
  const [note, setNote] = useState(q.note || '');
  const [todo, setTodo] = useState('');
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { setTitle(q.title); setNote(q.note || ''); }, [q.id, q.title, q.note]);
  const doneN = todos.filter((t) => t.done).length;

  function clear() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => b.setDone(q, true), 700);
  }

  async function checkTodo(t: QuestTodo) {
    const willAllDone = !t.done && todos.length > 0 && todos.every((x) => (x.id === t.id ? true : x.done));
    await b.toggleTodo(t);
    if (willAllDone) clear();
  }

  async function addTodo(e: FormEvent) {
    e.preventDefault();
    const t = todo;
    setTodo('');
    await b.addTodo(q.id, t);
  }

  return (
    <li className={'qcard' + (expanded ? ' open' : '') + (leaving ? ' leaving' : '')} data-testid="quest">
      <div className="qrow">
        <button className="qcheck" onClick={clear} aria-label={`${q.title} 퀘스트 깨기`} title="퀘스트 깨기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>
        </button>
        <button className="qtitle" onClick={onToggle} aria-expanded={expanded}>
          <span>{q.title}</span>
          {q.note && !expanded && <small>{q.note.split('\n')[0].slice(0, 60)}</small>}
        </button>
        {todos.length > 0 && <span className={'qcount' + (doneN === todos.length ? ' full' : '')}>{doneN}/{todos.length}</span>}
        {q.carried_count > 0 && <span className="qcarry" title="지난 날에서 넘어온 퀘스트">{q.carried_count}번 넘어옴</span>}
        <span className="qchev" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
        {leaving && <span className="qburst" aria-hidden="true">퀘스트 클리어! +{POINTS.quest}</span>}
      </div>

      {todos.length > 0 && !expanded && (
        <div className="qbar" aria-hidden="true"><i style={{ width: `${(doneN / todos.length) * 100}%` }} /></div>
      )}

      {expanded && (
        <div className="qbody">
          <label className="qfield">
            <span>퀘스트 이름</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== q.title && b.saveQuest(q.id, { title })} />
          </label>
          <label className="qfield">
            <span>상세 설명</span>
            <textarea rows={3} value={note} placeholder="무엇을, 왜, 어디까지 하면 끝인지 적어 두세요" onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (q.note || '') && b.saveQuest(q.id, { note })} />
          </label>

          <div className="qtodos">
            <div className="qsub">할 일 목록 <span className="qb-mut">· 다 체크하면 퀘스트가 깨져요</span></div>
            <ul>
              {todos.map((t) => (
                <TodoRow key={t.id} t={t} onCheck={() => checkTodo(t)} onRename={(v) => b.renameTodo(t, v)} onRemove={() => b.removeTodo(t)} />
              ))}
            </ul>
            <form className="qtodo-add" onSubmit={addTodo}>
              <label className="sr" htmlFor={`todo-${q.id}`}>할 일 추가</label>
              <input id={`todo-${q.id}`} value={todo} onChange={(e) => setTodo(e.target.value)} placeholder="+ 할 일 추가 (Enter)" autoComplete="off" />
            </form>
          </div>

          <div className="qactions">
            <button className="qbtn main" onClick={clear}>퀘스트 깨기</button>
            {q.carried_count >= 3 && <button className="qbtn" onClick={() => b.dropQuest(q)}>내려놓기</button>}
            <button className="qbtn danger" onClick={() => { if (confirm(`'${q.title}' 퀘스트를 삭제할까요? 할 일 목록도 함께 지워져요.`)) b.removeQuest(q); }}>삭제</button>
          </div>
          {q.carried_count >= 3 && <p className="qb-mut">세 번 넘게 넘어온 퀘스트예요. 지금 꼭 필요한 일이 아니면 내려놓아도 괜찮아요.</p>}
        </div>
      )}
    </li>
  );
}

function TodoRow({ t, onCheck, onRename, onRemove }: { t: QuestTodo; onCheck: () => void; onRename: (v: string) => void; onRemove: () => void }) {
  const [v, setV] = useState(t.title);
  useEffect(() => setV(t.title), [t.title]);
  return (
    <li className={'qtodo' + (t.done ? ' done' : '')}>
      <button className="tcheck" onClick={onCheck} aria-pressed={t.done} aria-label={`${t.title} ${t.done ? '체크 해제' : '체크'}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>
      </button>
      <input value={v} aria-label="할 일 이름" onChange={(e) => setV(e.target.value)} onBlur={() => onRename(v)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <button className="tdel" onClick={onRemove} aria-label={`${t.title} 지우기`}>×</button>
    </li>
  );
}

function LevelBadge({ points }: { points: number }) {
  const lv = levelFor(points);
  const from = needFor(lv), to = needFor(lv + 1);
  const pct = Math.round(((points - from) / (to - from)) * 100);
  return (
    <div className="qb-lv" title={`퀘스트 깨기 +${POINTS.quest} · 할 일 체크 +${POINTS.todo}`}>
      <b data-testid="level">Lv.{lv}</b>
      <div className="qb-lvbar" role="progressbar" aria-label="다음 레벨까지" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      <span className="qb-mut">{to - points}점 남음</span>
    </div>
  );
}

function LevelUp({ lv, onClose }: { lv: number; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2600); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="lvup" role="status" onClick={onClose}>
      <div className="lvup-card">
        <div className="lvup-rays" aria-hidden="true" />
        <small>LEVEL UP</small>
        <b>Lv.{lv}</b>
        <span>{lv === 1 ? '첫 퀘스트를 깼어요!' : lv < 5 ? '좋아요, 이 흐름 그대로!' : '계획하는 근육이 붙고 있어요'}</span>
      </div>
    </div>
  );
}
