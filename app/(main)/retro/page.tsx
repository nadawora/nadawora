'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST, weekStart, monthStart, monthEnd, addDays, fmtShort, weekNumber } from '@/lib/date';
import type { Retro } from '@/lib/types';

type Kind = 'daily' | 'weekly' | 'monthly';
const KIND_LABEL: Record<Kind, string> = { daily: '일일', weekly: '주간', monthly: '월간' };
const FIELDS: Record<Kind, { key: 'good' | 'bad' | 'next' | 'free'; label: string; rows: number }[]> = {
  daily: [
    { key: 'good', label: '잘한 것', rows: 2 },
    { key: 'bad', label: '아쉬운 것', rows: 2 },
    { key: 'next', label: '내일 할 것', rows: 2 },
    { key: 'free', label: '오늘 생각 정리 (자유롭게)', rows: 4 },
  ],
  weekly: [
    { key: 'good', label: '이번 주 잘한 것', rows: 3 },
    { key: 'bad', label: '이번 주 아쉬운 것', rows: 3 },
    { key: 'next', label: '다음 주에 할 것', rows: 3 },
    { key: 'free', label: '자유롭게', rows: 3 },
  ],
  monthly: [
    { key: 'good', label: '이번 달 가장 큰 변화', rows: 3 },
    { key: 'bad', label: '꿈에 얼마나 가까워졌나', rows: 3 },
    { key: 'next', label: '다음 달 목표', rows: 3 },
    { key: 'free', label: '자유롭게', rows: 3 },
  ],
};

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
  if (kind === 'monthly') return `${Number(start.slice(5, 7))}월`;
  return fmtShort(start);
}
const empty = (kind: Kind, period: string): Retro => ({ kind, period_start: period, mood: null, good: '', bad: '', next: '', free: '' });

export default function RetroPage() {
  const { wsId, memberId } = useWs();
  const [kind, setKind] = useState<Kind>('daily');
  const [date, setDate] = useState(todayKST());
  const [form, setForm] = useState<Retro>(empty('daily', todayKST()));
  const [summary, setSummary] = useState<{ habits: number; quests: number; dailies: number; diet: number } | null>(null);
  const [recent, setRecent] = useState<Retro[]>([]);
  const [saved, setSaved] = useState('');

  const period = periodOf(kind, date);

  const load = useCallback(async () => {
    const db = sb();
    const { data } = await db.from('retros').select('*').eq('member_id', memberId).eq('kind', kind).eq('period_start', period).maybeSingle();
    setForm(data ? (data as Retro) : empty(kind, period));
    if (kind !== 'daily') {
      const end = periodEnd(kind, period);
      const [h, q, r, d] = await Promise.all([
        db.from('habit_logs').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).gte('log_date', period).lte('log_date', end),
        db.from('quests').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('status', 'done').gte('quest_date', period).lte('quest_date', end),
        db.from('retros').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('kind', 'daily').gte('period_start', period).lte('period_start', end),
        db.from('diet_logs').select('id', { count: 'exact', head: true }).eq('member_id', memberId).gte('log_date', period).lte('log_date', end),
      ]);
      setSummary({ habits: h.count || 0, quests: q.count || 0, dailies: r.count || 0, diet: d.count || 0 });
    } else setSummary(null);
    const rec = await db.from('retros').select('*').eq('member_id', memberId).eq('kind', kind).order('period_start', { ascending: false }).limit(8);
    setRecent((rec.data || []) as Retro[]);
  }, [wsId, memberId, kind, period]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const { error } = await sb().from('retros').upsert({
      workspace_id: wsId, member_id: memberId, kind, period_start: period,
      mood: form.mood, good: form.good, bad: form.bad, next: form.next, free: form.free, updated_at: new Date().toISOString(),
    }, { onConflict: 'member_id,kind,period_start' });
    setSaved(error ? '저장하지 못했어요: ' + error.message : '저장했어요');
    setTimeout(() => setSaved(''), 2200);
    if (!error) load();
  }

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">{periodLabel(kind, period)}</div><h1>{KIND_LABEL[kind]} 회고</h1></div>
        <div className="tabs" role="tablist" aria-label="회고 종류">
          {(['daily', 'weekly', 'monthly'] as Kind[]).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className={'tab' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
          ))}
        </div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="card">
          <label className="f">날짜
            <input type="date" className="in" value={date} max={todayKST()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          {summary && (
            <div className="card flat" style={{ gap: 6 }}>
              <b>자동 요약</b>
              <span>습관 체크 <b>{summary.habits}</b>번 · 완료한 퀘스트 <b>{summary.quests}</b>개 · 일일 회고 <b>{summary.dailies}</b>일 · 다이어트 기록 <b>{summary.diet}</b>일</span>
            </div>
          )}
          {kind === 'daily' && (
            <div className="stack" style={{ gap: 6 }}>
              <b style={{ fontSize: 13 }}>오늘 컨디션</b>
              <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }} role="group" aria-label="컨디션 점수">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={'tab' + (form.mood === n ? ' on' : '')} style={{ width: 44, padding: 0 }} onClick={() => setForm({ ...form, mood: form.mood === n ? null : n })} aria-pressed={form.mood === n}>{n}</button>
                ))}
              </div>
            </div>
          )}
          {FIELDS[kind].map((f) => (
            <label key={f.key} className="f">{f.label}
              <textarea className="in" rows={f.rows} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </label>
          ))}
          <div className="row"><button className="btn" onClick={save}>저장</button><span className="mut" role="status">{saved}</span></div>
        </section>

        <section className="card">
          <h2>지난 {KIND_LABEL[kind]} 회고</h2>
          {recent.length === 0 && <div className="empty">아직 쓴 회고가 없어요.</div>}
          {recent.map((r) => (
            <button key={r.period_start} className="card flat" style={{ border: 0, textAlign: 'left', cursor: 'pointer', gap: 4 }} onClick={() => setDate(r.period_start)}>
              <div className="row"><b>{periodLabel(kind, r.period_start)}</b>{r.mood && <span className="pill">컨디션 {r.mood}</span>}</div>
              <span className="mut">{(r.good || r.free || r.next || '').slice(0, 60) || '내용 없음'}</span>
            </button>
          ))}
        </section>
      </div>
    </>
  );
}
