'use client';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST, weekStart, monthStart, monthEnd, addDays, fmtShort, fmtLong, weekNumber } from '@/lib/date';
import type { Quest, Retro } from '@/lib/types';

type Kind = 'daily' | 'weekly' | 'monthly';
type Field = 'good' | 'bad' | 'next' | 'free';
const KIND_LABEL: Record<Kind, string> = { daily: '일일', weekly: '주간', monthly: '월간' };
const FIELDS: Record<Kind, { key: Field; label: string; hint: string; rows: number }[]> = {
  daily: [
    { key: 'good', label: '오늘 잘한 일', hint: '작은 것도 좋아요', rows: 3 },
    { key: 'bad', label: '오늘 아쉬웠던 일', hint: '다음에 바꿀 한 가지', rows: 3 },
    { key: 'next', label: '내일 가장 중요하게 해야 할 일', hint: '한 가지만 적어요', rows: 2 },
    { key: 'free', label: '일기', hint: '자유롭게 써요', rows: 7 },
  ],
  weekly: [
    { key: 'good', label: '이번 주 잘한 것', hint: '', rows: 3 },
    { key: 'bad', label: '이번 주 아쉬운 것', hint: '', rows: 3 },
    { key: 'next', label: '다음 주에 할 것', hint: '', rows: 3 },
    { key: 'free', label: '자유롭게', hint: '', rows: 3 },
  ],
  monthly: [
    { key: 'good', label: '이번 달 가장 큰 변화', hint: '', rows: 3 },
    { key: 'bad', label: '꿈에 얼마나 가까워졌나', hint: '', rows: 3 },
    { key: 'next', label: '다음 달 목표', hint: '', rows: 3 },
    { key: 'free', label: '자유롭게', hint: '', rows: 3 },
  ],
};
const MOODS = ['아주 나쁨', '나쁨', '보통', '좋음', '아주 좋음'];

function periodOf(kind: Kind, date: string) {
  if (kind === 'weekly') return weekStart(date);
  if (kind === 'monthly') return monthStart(date);
  return date;
}
function periodEnd(kind: Kind, start: string) {
  if (kind === 'weekly') return addDays(start, 6);
  if (kind === 'monthly') return monthEnd(start);
  return start;
}
function periodLabel(kind: Kind, start: string) {
  if (kind === 'weekly') return `${weekNumber(start)}주차 · ${fmtShort(start)} ~ ${fmtShort(addDays(start, 6))}`;
  if (kind === 'monthly') return `${start.slice(0, 4)}년 ${Number(start.slice(5, 7))}월`;
  return fmtLong(start);
}
const empty = (kind: Kind, period: string): Retro => ({ kind, period_start: period, mood: null, good: '', bad: '', next: '', free: '' });
const same = (a: Retro, b: Retro) => a.mood === b.mood && (['good', 'bad', 'next', 'free'] as Field[]).every((k) => (a[k] || '') === (b[k] || ''));

function RetroInner() {
  const { wsId, memberId } = useWs();
  const params = useSearchParams();
  const today = todayKST();
  const [kind, setKind] = useState<Kind>('daily');
  const [date, setDate] = useState(params.get('d') || today);
  const [form, setForm] = useState<Retro>(empty('daily', date));
  const [base, setBase] = useState<Retro>(empty('daily', date));
  const [loaded, setLoaded] = useState(false);
  const [summary, setSummary] = useState<{ habits: number; quests: number; dailies: number; diet: number } | null>(null);
  const [dayQuests, setDayQuests] = useState<Quest[]>([]);
  const [recent, setRecent] = useState<Retro[]>([]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const period = periodOf(kind, date);
  const dirty = loaded && !same(form, base);

  const say = (msg: string) => {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(''), 3000);
  };

  const load = useCallback(async () => {
    setLoaded(false);
    const db = sb();
    const { data } = await db.from('retros').select('*').eq('member_id', memberId).eq('kind', kind).eq('period_start', period).maybeSingle();
    const r = data ? (data as Retro) : empty(kind, period);
    setForm(r); setBase(r);
    if (kind !== 'daily') {
      const end = periodEnd(kind, period);
      const [h, q, rr, d] = await Promise.all([
        db.from('habit_logs').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).gte('log_date', period).lte('log_date', end),
        db.from('quests').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('status', 'done').gte('quest_date', period).lte('quest_date', end),
        db.from('retros').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('kind', 'daily').gte('period_start', period).lte('period_start', end),
        db.from('diet_logs').select('id', { count: 'exact', head: true }).eq('member_id', memberId).gte('log_date', period).lte('log_date', end),
      ]);
      setSummary({ habits: h.count || 0, quests: q.count || 0, dailies: rr.count || 0, diet: d.count || 0 });
      setDayQuests([]);
    } else {
      setSummary(null);
      const q = await db.from('quests').select('*').eq('workspace_id', wsId).eq('quest_date', period).neq('status', 'dropped').order('created_at');
      setDayQuests((q.data || []) as Quest[]);
    }
    const rec = await db.from('retros').select('*').eq('member_id', memberId).eq('kind', kind).order('period_start', { ascending: false }).limit(10);
    setRecent((rec.data || []) as Retro[]);
    setLoaded(true);
  }, [wsId, memberId, kind, period]);

  useEffect(() => { load(); }, [load]);

  // 저장하지 않고 다른 날짜로 가려 하면 한 번 물어봐요.
  function go(next: () => void) {
    if (dirty && !confirm('저장하지 않은 내용이 있어요. 저장하지 않고 이동할까요?')) return;
    next();
  }
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function save() {
    setSaving(true);
    const { data, error } = await sb().from('retros').upsert({
      workspace_id: wsId, member_id: memberId, kind, period_start: period,
      mood: form.mood, good: form.good, bad: form.bad, next: form.next, free: form.free, updated_at: new Date().toISOString(),
    }, { onConflict: 'member_id,kind,period_start' }).select().single();
    setSaving(false);
    if (error) { say('저장하지 못했어요: ' + error.message); return; }
    const r = data as Retro;
    setForm(r); setBase(r);
    say('저장했어요 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    const rec = await sb().from('retros').select('*').eq('member_id', memberId).eq('kind', kind).order('period_start', { ascending: false }).limit(10);
    setRecent((rec.data || []) as Retro[]);
  }

  // "내일 가장 중요한 일"을 내일의 메인 퀘스트로 바로 등록해요.
  async function toTomorrow() {
    const title = (form.next || '').trim().split('\n')[0].slice(0, 120);
    if (!title) return;
    const tomorrow = addDays(period, 1);
    const db = sb();
    const has = await db.from('quests').select('id').eq('workspace_id', wsId).eq('quest_date', tomorrow).eq('kind', 'main').neq('status', 'dropped').maybeSingle();
    const kindQ = has.data ? 'sub' : 'main';
    const { error } = await db.from('quests').insert({ workspace_id: wsId, member_id: memberId, title, kind: kindQ, quest_date: tomorrow });
    say(error ? '등록하지 못했어요: ' + error.message : kindQ === 'main' ? '내일의 메인 퀘스트로 등록했어요' : '내일 메인 퀘스트가 이미 있어서 서브 퀘스트로 등록했어요');
  }

  const doneQ = dayQuests.filter((q) => q.status === 'done');
  const step = kind === 'daily' ? 1 : kind === 'weekly' ? 7 : 0;
  const move = (dir: number) => go(() => setDate(kind === 'monthly' ? monthStart(addDays(dir > 0 ? monthEnd(period) : period, dir)) : addDays(date, dir * step)));

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">{periodLabel(kind, period)}</div><h1>{KIND_LABEL[kind]} 회고</h1></div>
        <div className="tabs" role="tablist" aria-label="회고 종류">
          {(['daily', 'weekly', 'monthly'] as Kind[]).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className={'tab' + (kind === k ? ' on' : '')} onClick={() => go(() => setKind(k))}>{KIND_LABEL[k]}</button>
          ))}
        </div>
      </div>

      <nav className="datenav" aria-label="기간 이동">
        <button className="btn ghost sm" onClick={() => move(-1)}>‹ 이전</button>
        <label className="sr" htmlFor="retro-date">날짜 고르기</label>
        <input id="retro-date" type="date" className="in" value={date} onChange={(e) => e.target.value && go(() => setDate(e.target.value))} />
        <button className="btn ghost sm" onClick={() => move(1)}>다음 ›</button>
        {periodOf(kind, today) !== period && <button className="btn sm" onClick={() => go(() => setDate(today))}>오늘로</button>}
      </nav>

      <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="card" aria-busy={!loaded}>
          {kind === 'daily' && (
            <div className="card flat" style={{ gap: 6 }}>
              <div className="row"><b>이날의 퀘스트</b><Link className="mut" href="/">오늘 화면</Link></div>
              {dayQuests.length === 0 ? <span className="mut">기록된 퀘스트가 없어요.</span> : (
                <span>완료 <b>{doneQ.length}</b> / {dayQuests.length}{doneQ.length > 0 && <span className="mut"> · {doneQ.map((q) => q.title).join(', ').slice(0, 80)}</span>}</span>
              )}
            </div>
          )}
          {summary && (
            <div className="card flat" style={{ gap: 6 }}>
              <b>자동 요약</b>
              <span>습관 체크 <b>{summary.habits}</b>번 · 완료한 퀘스트 <b>{summary.quests}</b>개 · 일일 회고 <b>{summary.dailies}</b>일 · 다이어트 기록 <b>{summary.diet}</b>일</span>
            </div>
          )}
          {kind === 'daily' && (
            <div className="stack" style={{ gap: 6 }}>
              <b style={{ fontSize: 13 }}>오늘의 컨디션</b>
              <div className="moods" role="radiogroup" aria-label="오늘의 컨디션">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} role="radio" aria-checked={form.mood === n} className={'mood m' + n + (form.mood === n ? ' on' : '')} onClick={() => setForm({ ...form, mood: form.mood === n ? null : n })}>
                    <b>{n}</b><span>{MOODS[n - 1]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {FIELDS[kind].map((f) => (
            <label key={f.key} className="f">
              <span>{f.label}{f.hint && <span className="mut" style={{ fontWeight: 400 }}> · {f.hint}</span>}</span>
              <textarea className="in" rows={f.rows} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(); } }} />
            </label>
          ))}
          {kind === 'daily' && (form.next || '').trim() && (
            <button className="btn ghost sm" onClick={toTomorrow}>내일 퀘스트로 등록하기</button>
          )}
          <div className="row savebar">
            <button className="btn" onClick={save} disabled={saving || !loaded}>{saving ? '저장 중…' : '저장'}</button>
            <span className="mut" role="status">{status || (dirty ? '저장하지 않은 내용이 있어요' : base.id ? '저장된 회고예요' : '')}</span>
          </div>
        </section>

        <section className="card">
          <h2>지난 {KIND_LABEL[kind]} 회고</h2>
          {recent.length === 0 && <div className="empty">아직 쓴 회고가 없어요.</div>}
          {recent.map((r) => (
            <button key={r.period_start} className={'card flat' + (r.period_start === period ? ' picked' : '')} style={{ border: 0, textAlign: 'left', cursor: 'pointer', gap: 4 }} onClick={() => go(() => setDate(r.period_start))}>
              <div className="row"><b>{kind === 'daily' ? fmtShort(r.period_start) : periodLabel(kind, r.period_start)}</b>{r.mood && <span className="pill">컨디션 {MOODS[r.mood - 1]}</span>}</div>
              <span className="mut">{(r.good || r.free || r.next || '').slice(0, 60) || '내용 없음'}</span>
            </button>
          ))}
        </section>
      </div>
    </>
  );
}

export default function RetroPage() {
  return <Suspense fallback={<div className="center-msg" style={{ minHeight: '40vh' }}><div className="loader" aria-label="불러오는 중"></div></div>}><RetroInner /></Suspense>;
}
