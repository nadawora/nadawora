'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST, fmtLong, addYears } from '@/lib/date';
import { levelOf, totalXp, XP_RULES } from '@/lib/xp';
import type { Habit, HabitLog, Level, Quest, DietLog } from '@/lib/types';

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function TodayPage() {
  const { wsId, memberId, topics, version } = useWs();
  const today = todayKST();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [overdue, setOverdue] = useState<Quest[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, Level>>({});
  const [diet, setDiet] = useState<DietLog>({ log_date: today, weight: null, water_cups: 0, steps: null, meals: {}, memo: null });
  const [xp, setXp] = useState(0);
  const [mainText, setMainText] = useState('');
  const [subText, setSubText] = useState('');
  const [hard, setHard] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const db = sb();
    const [q, od, h, l, d, x] = await Promise.all([
      db.from('quests').select('*').eq('workspace_id', wsId).eq('quest_date', today).neq('status', 'dropped').order('created_at'),
      db.from('quests').select('*').eq('workspace_id', wsId).lt('quest_date', today).eq('status', 'open').order('quest_date'),
      db.from('habits').select('*').eq('workspace_id', wsId).eq('active', true).order('sort'),
      db.from('habit_logs').select('*').eq('workspace_id', wsId).eq('log_date', today),
      db.from('diet_logs').select('*').eq('member_id', memberId).eq('log_date', today).maybeSingle(),
      totalXp(wsId),
    ]);
    setQuests((q.data || []) as Quest[]);
    setOverdue((od.data || []) as Quest[]);
    setHabits((h.data || []) as Habit[]);
    const m: Record<string, Level> = {};
    ((l.data || []) as HabitLog[]).forEach((x) => { m[x.habit_id] = x.level; });
    setLogs(m);
    if (d.data) setDiet(d.data as DietLog);
    setXp(x);
    setLoaded(true);
  }, [wsId, memberId, today]);

  useEffect(() => { load(); }, [load, version]);
  useEffect(() => {
    try { setHard(localStorage.getItem('hard-' + today) === '1'); } catch { /* 저장소 없음 */ }
  }, [today]);

  function toggleHard() {
    const v = !hard; setHard(v);
    try { localStorage.setItem('hard-' + today, v ? '1' : '0'); } catch { /* 저장소 없음 */ }
  }

  const main = quests.find((q) => q.kind === 'main');
  const subs = quests.filter((q) => q.kind === 'sub');

  async function addQuest(kind: 'main' | 'sub', title: string) {
    if (!title.trim()) return;
    await sb().from('quests').insert({ workspace_id: wsId, member_id: memberId, title: title.trim(), kind, quest_date: today });
    if (kind === 'main') setMainText(''); else setSubText('');
    load();
  }
  async function toggleQuest(q: Quest) {
    const done = q.status !== 'done';
    setQuests((qs) => qs.map((x) => (x.id === q.id ? { ...x, status: done ? 'done' : 'open' } : x)));
    setXp((v) => v + (done ? 1 : -1) * XP_RULES[q.kind]);
    await sb().from('quests').update({ status: done ? 'done' : 'open', done_at: done ? new Date().toISOString() : null }).eq('id', q.id);
  }
  async function removeQuest(q: Quest) {
    await sb().from('quests').delete().eq('id', q.id);
    load();
  }
  async function carry(q: Quest) {
    const kind = q.kind === 'main' && main ? 'sub' : q.kind;
    await sb().from('quests').update({ quest_date: today, kind, carried_count: q.carried_count + 1 }).eq('id', q.id);
    load();
  }
  async function drop(q: Quest) {
    await sb().from('quests').update({ status: 'dropped' }).eq('id', q.id);
    load();
  }
  async function setLevel(h: Habit, lv: Level) {
    const cur = logs[h.id];
    const next = { ...logs };
    if (cur === lv) {
      delete next[h.id]; setLogs(next); setXp((v) => v - XP_RULES[lv]);
      await sb().from('habit_logs').delete().eq('habit_id', h.id).eq('log_date', today);
    } else {
      next[h.id] = lv; setLogs(next); setXp((v) => v - (cur ? XP_RULES[cur] : 0) + XP_RULES[lv]);
      await sb().from('habit_logs').upsert({ workspace_id: wsId, habit_id: h.id, log_date: today, level: lv }, { onConflict: 'habit_id,log_date' });
    }
  }
  async function saveDiet(patch: Partial<DietLog>) {
    const next = { ...diet, ...patch };
    setDiet(next);
    const isNew = !diet.id;
    const { data } = await sb().from('diet_logs').upsert({ workspace_id: wsId, member_id: memberId, log_date: today, weight: next.weight, water_cups: next.water_cups, steps: next.steps, meals: next.meals, memo: next.memo }, { onConflict: 'member_id,log_date' }).select().single();
    if (data) setDiet(data as DietLog);
    if (isNew) setXp((v) => v + XP_RULES.diet);
  }

  const lv = levelOf(xp);
  const habitsLeft = habits.filter((h) => !logs[h.id]).length;
  const questsLeft = quests.filter((q) => q.status === 'open').length;
  const left = habitsLeft + questsLeft;
  const topicName = (id: string | null) => topics.find((t) => t.id === id)?.name;

  if (!loaded) return <div className="center-msg" style={{ minHeight: '50vh' }}><div className="loader" aria-label="불러오는 중"></div></div>;

  return (
    <>
      <div className="row wrap">
        <div>
          <div className="mut">{fmtLong(today)}</div>
          <h1>{left === 0 ? '오늘 할 일을 다 해냈어요' : `오늘 퀘스트 ${left}개 남았어요`}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className={'btn sm ' + (hard ? 'dark' : 'ghost')} onClick={toggleHard} aria-pressed={hard}>{hard ? '힘든 날 모드 켜짐' : '힘든 날 모드'}</button>
          <Link className="btn ghost sm" href={'/past?d=' + addYears(today, -1)}>1년 전 오늘</Link>
        </div>
      </div>

      {hard && <div className="card warn"><b>오늘은 메인 퀘스트 하나와 Mini만 해도 성공이에요.</b><span className="mut">서브 퀘스트는 잠시 접어 둘게요. 연속 기록은 끊기지 않아요.</span></div>}

      {overdue.length > 0 && (
        <div className="card warn">
          <h2>지난 퀘스트 {overdue.length}개가 남아 있어요</h2>
          {overdue.map((q) => (
            <div key={q.id} className="row wrap" style={{ borderTop: '1px solid #FFE0BF', paddingTop: 10 }}>
              <span>{q.title} <span className="mut">· {q.quest_date.slice(5).replace('-', '/')}</span></span>
              <span className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => carry(q)}>오늘로 넘기기</button>
                <button className="btn ghost sm" onClick={() => drop(q)}>내려놓기</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid2">
        <section className="card hero">
          <span className="mut" style={{ fontWeight: 700 }}>메인 퀘스트</span>
          {main ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, textDecoration: main.status === 'done' ? 'line-through' : 'none' }}>{main.title}</div>
              <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <button className="btn white" onClick={() => toggleQuest(main)}>{main.status === 'done' ? '완료 취소' : `완료하기 +${XP_RULES.main}`}</button>
                <button className="btn sm" style={{ background: 'transparent', border: '1px solid #8FA9F5' }} onClick={() => removeQuest(main)}>바꾸기</button>
              </div>
            </>
          ) : (
            <form className="stack" onSubmit={(e) => { e.preventDefault(); addQuest('main', mainText); }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>오늘 가장 중요한 한 가지는?</div>
              <label className="sr" htmlFor="main-q">메인 퀘스트</label>
              <input id="main-q" className="in" value={mainText} onChange={(e) => setMainText(e.target.value)} placeholder="예: 공급처 1곳에 연락하기" style={{ color: '#191F28' }} />
              <button className="btn white" disabled={!mainText.trim()}>메인 퀘스트로 정하기</button>
            </form>
          )}
        </section>

        <section className="card">
          <div className="row"><h2>Lv.{lv.level}</h2><span className="mut">{lv.inLevel} / {lv.need} XP</span></div>
          <div className="bar"><i style={{ width: lv.pct + '%' }} /></div>
          <div className="mut">메인 퀘스트 +{XP_RULES.main} · 서브 +{XP_RULES.sub} · 습관 Mini +{XP_RULES.mini} / More +{XP_RULES.more} / Max +{XP_RULES.max} · 회고 +{XP_RULES.daily} · 다이어트 기록 +{XP_RULES.diet}</div>
        </section>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="row"><h2>오늘의 습관</h2><span className="mut">{habits.length - habitsLeft} / {habits.length}</span></div>
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

        <div className="stack" style={{ gap: 14 }}>
          <section className="card">
            <div className="row"><h2>서브 퀘스트</h2><span className="mut">{subs.filter((q) => q.status === 'done').length} / {subs.length}</span></div>
            {hard ? (
              <div className="empty">힘든 날 모드라 서브 퀘스트를 접어 뒀어요.</div>
            ) : (
              <>
                {subs.length === 0 && <div className="empty">오늘 할 일을 하나씩 적어 보세요.</div>}
                {subs.map((q) => (
                  <div key={q.id} className={'q' + (q.status === 'done' ? ' done' : '')}>
                    <button className={'ck' + (q.status === 'done' ? ' on' : '')} onClick={() => toggleQuest(q)} aria-label={q.title + (q.status === 'done' ? ' 완료 취소' : ' 완료')}>{q.status === 'done' && <Check />}</button>
                    <span className="t">{q.title}{q.carried_count > 0 && <span className="mut"> · {q.carried_count}번 넘김</span>}</span>
                    <button className="x" onClick={() => removeQuest(q)} aria-label={q.title + ' 삭제'}>삭제</button>
                  </div>
                ))}
                <form className="row" onSubmit={(e) => { e.preventDefault(); addQuest('sub', subText); }}>
                  <label className="sr" htmlFor="sub-q">서브 퀘스트 추가</label>
                  <input id="sub-q" className="in" value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="+ 서브 퀘스트 추가" />
                  <button className="btn" disabled={!subText.trim()}>추가</button>
                </form>
              </>
            )}
          </section>

          <section className="card">
            <div className="row"><h2>오늘의 다이어트</h2><Link href="/diet" className="mut">자세히</Link></div>
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
                <input className="in" inputMode="numeric" defaultValue={diet.steps ?? ''} key={'s' + (diet.id || '')} onBlur={(e) => saveDiet({ steps: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })} placeholder="0" style={{ padding: '8px 10px' }} />
              </label>
              <label className="card flat f" style={{ padding: 12, gap: 6 }}>
                <span className="mut" style={{ fontWeight: 400 }}>체중(kg)</span>
                <input className="in" inputMode="decimal" defaultValue={diet.weight ?? ''} key={'w' + (diet.id || '')} onBlur={(e) => saveDiet({ weight: e.target.value ? Number(e.target.value) : null })} placeholder="선택" style={{ padding: '8px 10px' }} />
              </label>
            </div>
          </section>
        </div>
      </div>

      <div className="row wrap" style={{ justifyContent: 'flex-start', gap: 8 }}>
        <Link className="btn ghost sm" href="/tasks">업무 대시보드</Link>
        <Link className="btn ghost sm" href="/office">AI 오피스</Link>
        <Link className="btn ghost sm" href="/retro">오늘 회고 쓰기</Link>
      </div>
    </>
  );
}
