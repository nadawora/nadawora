'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST, addDays, fmtLong, fmtMD } from '@/lib/date';
import type { DietLog } from '@/lib/types';

const MEALS: [string, string][] = [['breakfast', '아침'], ['lunch', '점심'], ['dinner', '저녁'], ['snack', '간식']];
const blank = (d: string): DietLog => ({ log_date: d, weight: null, water_cups: 0, steps: null, meals: {}, memo: '' });

function WeightChart({ rows }: { rows: DietLog[] }) {
  const pts = rows.filter((r) => r.weight != null);
  if (pts.length < 2) return <div className="empty">체중을 이틀 이상 기록하면 그래프가 그려져요.</div>;
  const ws = pts.map((p) => Number(p.weight));
  const min = Math.min(...ws) - 0.5, max = Math.max(...ws) + 0.5;
  const W = 600, H = 160, pad = 24;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(p.weight)).toFixed(1)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`최근 체중 ${ws[0]}kg에서 ${ws[ws.length - 1]}kg`}>
      <path d={d} fill="none" stroke="#2F5FE0" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={p.log_date} cx={x(i)} cy={y(Number(p.weight))} r="4" fill="#2F5FE0" />)}
    </svg>
  );
}

export default function DietPage() {
  const { wsId, memberId, bump } = useWs();
  const today = todayKST();
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<DietLog>(blank(today));
  const [rows, setRows] = useState<DietLog[]>([]);
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    const db = sb();
    const [one, list] = await Promise.all([
      db.from('diet_logs').select('*').eq('member_id', memberId).eq('log_date', date).maybeSingle(),
      db.from('diet_logs').select('*').eq('member_id', memberId).gte('log_date', addDays(today, -27)).order('log_date'),
    ]);
    setForm(one.data ? (one.data as DietLog) : blank(date));
    setRows((list.data || []) as DietLog[]);
  }, [memberId, date, today]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    const { error } = await sb().from('diet_logs').upsert({ workspace_id: wsId, member_id: memberId, log_date: date, weight: form.weight, water_cups: form.water_cups, steps: form.steps, meals: form.meals, memo: form.memo }, { onConflict: 'member_id,log_date' });
    setSaved(error ? '저장하지 못했어요: ' + error.message : '저장했어요');
    setTimeout(() => setSaved(''), 2200);
    if (!error) { load(); bump(); }
  }

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const byDate: Record<string, DietLog> = {};
  rows.forEach((r) => { byDate[r.log_date] = r; });
  const maxSteps = Math.max(8000, ...rows.map((r) => r.steps || 0));
  const week = rows.filter((r) => r.log_date >= addDays(today, -6));
  const avgSteps = week.filter((r) => r.steps).length ? Math.round(week.reduce((a, r) => a + (r.steps || 0), 0) / week.filter((r) => r.steps).length) : null;

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">{fmtLong(date)}</div><h1>다이어트 기록</h1></div>
        <input type="date" className="in" style={{ width: 170 }} value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="날짜" />
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="grid3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <label className="f">체중(kg)<input className="in" inputMode="decimal" value={form.weight ?? ''} onChange={(e) => { const v = e.target.value; setForm((cur) => ({ ...cur, weight: v ? Number(v) : null })); }} /></label>
            <label className="f">걸음<input className="in" inputMode="numeric" value={form.steps ?? ''} onChange={(e) => { const v = e.target.value; setForm((cur) => ({ ...cur, steps: v ? Number(v.replace(/\D/g, '')) : null })); }} /></label>
            <div className="f">물
              <div className="row" style={{ gap: 4 }}>
                <button className="btn ghost sm" onClick={() => setForm((cur) => ({ ...cur, water_cups: Math.max(0, cur.water_cups - 1) }))} aria-label="한 잔 빼기">−</button>
                <b>{form.water_cups}잔</b>
                <button className="btn sm" onClick={() => setForm((cur) => ({ ...cur, water_cups: cur.water_cups + 1 }))} aria-label="한 잔 더하기">+</button>
              </div>
            </div>
          </div>
          {MEALS.map(([k, label]) => (
            <label key={k} className="f">{label}
              <input className="in" value={form.meals?.[k] || ''} onChange={(e) => { const v = e.target.value; setForm((cur) => ({ ...cur, meals: { ...cur.meals, [k]: v } })); }} placeholder="무엇을 먹었는지 한 줄" />
            </label>
          ))}
          <label className="f">메모<textarea className="in" rows={2} value={form.memo || ''} onChange={(e) => { const v = e.target.value; setForm((cur) => ({ ...cur, memo: v })); }} /></label>
          <div className="row"><button className="btn" onClick={save}>저장</button><span className="mut" role="status">{saved}</span></div>
        </section>

        <div className="stack" style={{ gap: 14 }}>
          <section className="card">
            <div className="row"><h2>체중 흐름</h2><span className="mut">최근 4주</span></div>
            <WeightChart rows={rows} />
          </section>
          <section className="card">
            <div className="row"><h2>걸음 수</h2><span className="mut">{avgSteps ? `이번 주 평균 ${avgSteps.toLocaleString()}보` : '최근 2주'}</span></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }} role="img" aria-label="최근 2주 걸음 수 막대그래프">
              {days.map((d) => {
                const s = byDate[d]?.steps || 0;
                return (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', maxWidth: 22, height: `${Math.max(3, (s / maxSteps) * 100)}%`, background: s ? '#2F5FE0' : '#E9EDF4', borderRadius: 6 }} title={`${fmtMD(d)} ${s.toLocaleString()}보`} />
                    <span style={{ fontSize: 10, color: '#5D6675' }}>{Number(d.slice(8))}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card">
            <h2>이번 주 기록</h2>
            <span>기록한 날 <b>{week.length}</b>일 · 물 평균 <b>{week.length ? (week.reduce((a, r) => a + r.water_cups, 0) / week.length).toFixed(1) : 0}</b>잔</span>
          </section>
        </div>
      </div>
    </>
  );
}
