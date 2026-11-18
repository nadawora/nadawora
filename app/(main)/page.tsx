'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST, fmtLong, addYears, addDays } from '@/lib/date';
import { XP_RULES } from '@/lib/xp';
import { useQuestDay } from '@/lib/quests';
import QuestRow from '@/components/QuestRow';
import type { Habit, HabitLog, Level, DietLog } from '@/lib/types';

export default function TodayPage() {
  const { wsId, memberId, topics, version } = useWs();
  const today = todayKST();
  const [date, setDate] = useState(today);
  const day = useQuestDay(date);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, Level>>({});
  const emptyDiet = useCallback((d: string): DietLog => ({ log_date: d, weight: null, water_cups: 0, steps: null, meals: {}, memo: null }), []);
  const [diet, setDiet] = useState<DietLog>(emptyDiet(today));
  const [mainText, setMainText] = useState('');
  const [subText, setSubText] = useState('');
  const [editMain, setEditMain] = useState(false);
  const [hard, setHard] = useState(false);

  const loadDay = useCallback(async () => {
    const db = sb();
    const [h, l, d] = await Promise.all([
      db.from('habits').select('*').eq('workspace_id', wsId).eq('active', true).order('sort'),
      db.from('habit_logs').select('*').eq('workspace_id', wsId).eq('log_date', date),
      db.from('diet_logs').select('*').eq('member_id', memberId).eq('log_date', date).maybeSingle(),
    ]);
    setHabits((h.data || []) as Habit[]);
    const m: Record<string, Level> = {};
    ((l.data || []) as HabitLog[]).forEach((x) => { m[x.habit_id] = x.level; });
    setLogs(m);
    setDiet(d.data ? (d.data as DietLog) : emptyDiet(date));
  }, [wsId, memberId, date, emptyDiet]);

  useEffect(() => { loadDay(); }, [loadDay, version]);
  useEffect(() => {
    try { setHard(localStorage.getItem('hard-' + date) === '1'); } catch { /* 저장소 없음 */ }
  }, [date]);
  useEffect(() => {
    if (!day.levelUp) return;
    const t = setTimeout(day.clearLevelUp, 2600);
    return () => clearTimeout(t);
  }, [day.levelUp, day.clearLevelUp]);

  function toggleHard() {
    const v = !hard; setHard(v);
    try { localStorage.setItem('hard-' + date, v ? '1' : '0'); } catch { /* 저장소 없음 */ }
  }

  async function setLevel(h: Habit, lv: Level) {
    const cur = logs[h.id];
    const next = { ...logs };
    if (cur === lv) {
      delete next[h.id]; setLogs(next);
      await sb().from('habit_logs').delete().eq('habit_id', h.id).eq('log_date', date);
    } else {
      next[h.id] = lv; setLogs(next);
      await sb().from('habit_logs').upsert({ workspace_id: wsId, habit_id: h.id, log_date: date, level: lv }, { onConflict: 'habit_id,log_date' });
    }
    day.reload();
  }
  async function saveDiet(patch: Partial<DietLog>) {
    const next = { ...diet, ...patch };
    setDiet(next);
    const { data } = await sb().from('diet_logs').upsert({ workspace_id: wsId, member_id: memberId, log_date: date, weight: next.weight, water_cups: next.water_cups, steps: next.steps, meals: next.meals, memo: next.memo }, { onConflict: 'member_id,log_date' }).select().single();
    if (data) setDiet(data as DietLog);
    day.reload();
  }

  const { main, subs, level: lv } = day;
  const isToday = date === today;
  const habitsLeft = habits.filter((h) => !logs[h.id]).length;
  const topicName = (id: string | null) => topics.find((t) => t.id === id)?.name;
  const rel = date === today ? '오늘' : date === addDays(today, 1) ? '내일' : date === addDays(today, -1) ? '어제' : '';

  return (
    <>
      <div className="row wrap">
        <div>
          <div className="mut">{fmtLong(date)}{rel && ' · ' + rel}</div>
          <h1>{!day.loaded ? '불러오는 중…' : day.total === 0 ? (isToday ? '오늘의 퀘스트를 정해 볼까요?' : '이날의 계획을 세워 보세요') : day.doneCount === day.total ? '퀘스트를 모두 해냈어요' : `퀘스트 ${day.total - day.doneCount}개 남았어요`}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className={'btn sm ' + (hard ? 'dark' : 'ghost')} onClick={toggleHard} aria-pressed={hard}>{hard ? '힘든 날 모드 켜짐' : '힘든 날 모드'}</button>
          <Link className="btn ghost sm" href={'/past?d=' + addYears(date, -1)}>1년 전 이날</Link>
        </div>
      </div>

      <nav className="datenav" aria-label="날짜 이동">
        <button className="btn ghost sm" onClick={() => setDate(addDays(date, -1))} aria-label="하루 전">‹ 하루 전</button>
        <label className="sr" htmlFor="day-pick">날짜 고르기</label>
        <input id="day-pick" type="date" className="in" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button className="btn ghost sm" onClick={() => setDate(addDays(date, 1))} aria-label="하루 뒤">하루 뒤 ›</button>
        {!isToday && <button className="btn sm" onClick={() => setDate(today)}>오늘로</button>}
      </nav>

      {day.error && <div className="card warn" role="alert">{day.error}</div>}
      {day.levelUp > 0 && <div className="levelup" role="status">레벨 업! Lv.{day.levelUp}</div>}

      {hard && <div className="card warn"><b>오늘은 메인 퀘스트 하나와 Mini만 해도 성공이에요.</b><span className="mut">서브 퀘스트는 잠시 접어 둘게요. 연속 기록은 끊기지 않아요.</span></div>}

      {isToday && day.overdue.length > 0 && (
        <div className="card warn">
          <div className="row wrap"><h2>지난 퀘스트 {day.overdue.length}개가 남아 있어요</h2><button className="btn sm" onClick={() => day.carry(day.overdue)}>모두 오늘로 넘기기</button></div>
          {day.overdue.map((q) => (
            <div key={q.id} className="row wrap" style={{ borderTop: '1px solid #FFE0BF', paddingTop: 10 }}>
              <span>{q.kind === 'main' && <span className="pill">메인</span>} {q.title} <span className="mut">· {q.quest_date.slice(5).replace('-', '/')}</span></span>
              <span className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => day.carry([q])}>오늘로 넘기기</button>
                <button className="btn ghost sm" onClick={() => day.drop(q)}>내려놓기</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid2">
        <section className={'card hero' + (main?.status === 'done' ? ' cleared' : '')} aria-label="메인 퀘스트">
          <span className="mut" style={{ fontWeight: 700 }}>메인 퀘스트 · +{XP_RULES.main} XP</span>
          {main ? (
            <>
              {editMain ? (
                <form className="stack" onSubmit={(e) => { e.preventDefault(); day.rename(main, mainText); setEditMain(false); }}>
                  <label className="sr" htmlFor="main-edit">메인 퀘스트 고치기</label>
                  <input id="main-edit" className="in" autoFocus value={mainText} onChange={(e) => setMainText(e.target.value)} style={{ color: '#191F28' }} />
                  <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <button className="btn white" disabled={!mainText.trim()}>저장</button>
                    <button type="button" className="btn sm outline-w" onClick={() => setEditMain(false)}>취소</button>
                  </div>
                </form>
              ) : (
                <div className="main-title" style={{ textDecoration: main.status === 'done' ? 'line-through' : 'none' }}>{main.title}</div>
              )}
              {!editMain && (
                <div className="row wrap" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <button className={'btn white' + (main.status === 'done' ? '' : ' glow')} onClick={() => day.toggle(main)} aria-pressed={main.status === 'done'}>{main.status === 'done' ? '완료 취소' : `완료하기 +${XP_RULES.main}`}</button>
                  <button className="btn sm outline-w" onClick={() => { setMainText(main.title); setEditMain(true); }}>고치기</button>
                  <button className="btn sm outline-w" onClick={() => { if (confirm('메인 퀘스트를 지울까요?')) day.remove(main); }}>삭제</button>
                </div>
              )}
              {main.status === 'done' && <div className="cleared-badge" aria-hidden="true">CLEAR!</div>}
            </>
          ) : (
            <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (await day.add('main', mainText)) setMainText(''); }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{isToday ? '오늘' : '이날'} 가장 중요한 한 가지는?</div>
              <label className="sr" htmlFor="main-q">메인 퀘스트</label>
              <input id="main-q" className="in" value={mainText} onChange={(e) => setMainText(e.target.value)} placeholder="예: 공급처 1곳에 연락하기" style={{ color: '#191F28' }} />
              <button className="btn white" disabled={!mainText.trim()}>메인 퀘스트로 정하기</button>
            </form>
          )}
        </section>

        <section className="card" aria-label="달성률과 레벨">
          <div className="statrow">
            <div><span className="mut">전체</span><b data-testid="stat-total">{day.total}</b></div>
            <div><span className="mut">완료</span><b data-testid="stat-done">{day.doneCount}</b></div>
            <div><span className="mut">달성률</span><b data-testid="stat-rate">{day.rate}%</b></div>
          </div>
          <div className="bar"><i style={{ width: day.rate + '%' }} /></div>
          <div className="row" style={{ marginTop: 6 }}><h2 data-testid="level">Lv.{lv.level}</h2><span className="mut" data-testid="xp">{lv.inLevel} / {lv.need} XP</span></div>
          <div className="bar xpbar"><i style={{ width: lv.pct + '%' }} /></div>
          <div className="mut" style={{ fontSize: 12 }}>메인 +{XP_RULES.main} · 서브 +{XP_RULES.sub} · 습관 Mini +{XP_RULES.mini} / More +{XP_RULES.more} / Max +{XP_RULES.max} · 회고 +{XP_RULES.daily} · 다이어트 기록 +{XP_RULES.diet}</div>
        </section>
      </div>

      <div className="grid2">
        <div className="stack" style={{ gap: 14 }}>
          <section className="card" aria-label="서브 퀘스트">
            <div className="row"><h2>서브 퀘스트</h2><span className="mut">{subs.filter((q) => q.status === 'done').length} / {subs.length}</span></div>
            {hard ? (
              <div className="empty">힘든 날 모드라 서브 퀘스트를 접어 뒀어요.</div>
            ) : (
              <>
                {subs.length === 0 && <div className="empty">할 일을 하나씩 적어 보세요. 제목을 누르면 고칠 수 있어요.</div>}
                {subs.map((q) => (
                  <QuestRow key={q.id} q={q} onToggle={day.toggle} onRename={day.rename} onRemove={day.remove} onMakeMain={day.makeMain} />
                ))}
                <form className="row" onSubmit={async (e) => { e.preventDefault(); if (await day.add('sub', subText)) setSubText(''); }}>
                  <label className="sr" htmlFor="sub-q">서브 퀘스트 추가</label>
                  <input id="sub-q" className="in" value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="+ 서브 퀘스트 추가" />
                  <button className="btn" disabled={!subText.trim()}>추가</button>
                </form>
              </>
            )}
          </section>

          <section className="card">
            <div className="row"><h2>하루 회고</h2><span className="mut">+{XP_RULES.daily} XP</span></div>
            <span className="mut">잘한 일, 아쉬운 일, 내일 가장 중요한 일을 남겨요.</span>
            <Link className="btn" href={'/retro?d=' + date}>{rel || '이날'} 회고 쓰기</Link>
          </section>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <section className="card">
            <div className="row"><h2>습관</h2><span className="mut">{habits.length - habitsLeft} / {habits.length}</span></div>
            {habits.length === 0 && <div className="empty">아직 습관이 없어요. 목표·습관 메뉴에서 추가해 주세요.</div>}
            {habits.map((h) => (
              <div className="habit" key={h.id}>
                <div className="row"><h3>{h.title}</h3>{topicName(h.topic_id) && <span className="pill">{topicName(h.topic_id)}</span>}</div>
                <div className="mmm" role="group" aria-label={h.title + ' 단계 선택'}>
                  {(['mini', 'more', 'max'] as Level[]).map((k) => (
                    <button key={k} className={k + (logs[h.id] === k ? ' on' : '')} onClick={() => setLevel(h, k)} aria-pressed={logs[h.id] === k}>
                      <b>{k === 'mini' ? 'Mini' : k === 'more' ? 'More' : 'Max'}</b><span>{h[k]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="card">
            <div className="row"><h2>다이어트</h2><Link href="/diet" className="mut">자세히</Link></div>
            <div className="grid3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <div className="card flat" style={{ padding: 12, gap: 6 }}>
                <span className="mut">물</span>
                <b style={{ fontSize: 20 }}>{diet.water_cups}잔</b>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn ghost sm" style={{ flex: 1, padding: 0 }} onClick={() => saveDiet({ water_cups: Math.max(0, diet.water_cups - 1) })} aria-label="물 한 잔 빼기">−</button>
                  <button className="btn sm" style={{ flex: 1, padding: 0 }} onClick={() => saveDiet({ water_cups: diet.water_cups + 1 })} aria-label="물 한 잔 더하기">+</button>
                </div>
              </div>
              <label className="card flat f" style={{ padding: 12, gap: 6 }}>
                <span className="mut" style={{ fontWeight: 400 }}>걸음</span>
                <input className="in" inputMode="numeric" defaultValue={diet.steps ?? ''} key={'s' + date + (diet.id || '')} onBlur={(e) => saveDiet({ steps: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })} placeholder="0" style={{ padding: '8px 10px' }} />
              </label>
              <label className="card flat f" style={{ padding: 12, gap: 6 }}>
                <span className="mut" style={{ fontWeight: 400 }}>체중(kg)</span>
                <input className="in" inputMode="decimal" defaultValue={diet.weight ?? ''} key={'w' + date + (diet.id || '')} onBlur={(e) => saveDiet({ weight: e.target.value ? Number(e.target.value) : null })} placeholder="선택" style={{ padding: '8px 10px' }} />
              </label>
            </div>
          </section>
        </div>
      </div>

      <div className="row wrap" style={{ justifyContent: 'flex-start', gap: 8 }}>
        <Link className="btn ghost sm" href="/office">나다움오피에서 보기</Link>
      </div>
    </>
  );
}
