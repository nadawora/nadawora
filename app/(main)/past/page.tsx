'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import { todayKST, addYears, fmtLong } from '@/lib/date';
import type { Habit, HabitLog, Quest, Retro, DietLog, Idea } from '@/lib/types';

function PastInner() {
  const { wsId, memberId } = useWs();
  const params = useSearchParams();
  const router = useRouter();
  const today = todayKST();
  const date = params.get('d') || addYears(today, -1);
  const [data, setData] = useState<{ retros: Retro[]; quests: Quest[]; logs: (HabitLog & { title: string })[]; diet: DietLog | null; ideas: Idea[] } | null>(null);

  const load = useCallback(async () => {
    const db = sb();
    const [r, q, l, h, d, i] = await Promise.all([
      db.from('retros').select('*').eq('member_id', memberId).eq('period_start', date),
      db.from('quests').select('*').eq('workspace_id', wsId).eq('quest_date', date).neq('status', 'dropped'),
      db.from('habit_logs').select('*').eq('workspace_id', wsId).eq('log_date', date),
      db.from('habits').select('id, title').eq('workspace_id', wsId),
      db.from('diet_logs').select('*').eq('member_id', memberId).eq('log_date', date).maybeSingle(),
      db.from('ideas').select('*').eq('workspace_id', wsId).gte('created_at', date + 'T00:00:00+09:00').lte('created_at', date + 'T23:59:59+09:00'),
    ]);
    const names: Record<string, string> = {};
    ((h.data || []) as Pick<Habit, 'id' | 'title'>[]).forEach((x) => { names[x.id] = x.title; });
    setData({
      retros: (r.data || []) as Retro[],
      quests: (q.data || []) as Quest[],
      logs: ((l.data || []) as HabitLog[]).map((x) => ({ ...x, title: names[x.habit_id] || '습관' })),
      diet: (d.data || null) as DietLog | null,
      ideas: (i.data || []) as Idea[],
    });
  }, [wsId, memberId, date]);

  useEffect(() => { load(); }, [load]);

  const go = (d: string) => router.replace('/past?d=' + d);
  const empty = data && !data.retros.length && !data.quests.length && !data.logs.length && !data.diet && !data.ideas.length;
  const daily = data?.retros.find((r) => r.kind === 'daily');

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">과거의 오늘</div><h1>{fmtLong(date)}</h1></div>
        <div className="tabs">
          {[1, 2, 3].map((n) => (
            <button key={n} className={'tab' + (date === addYears(today, -n) ? ' on' : '')} onClick={() => go(addYears(today, -n))}>{n}년 전</button>
          ))}
          <label className="sr" htmlFor="past-d">날짜 고르기</label>
          <input id="past-d" type="date" className="in" style={{ width: 170 }} value={date} max={today} onChange={(e) => e.target.value && go(e.target.value)} />
        </div>
      </div>

      {!data && <div className="loader" aria-label="불러오는 중"></div>}
      {empty && <div className="card"><div className="empty">이날은 기록이 없어요. 오늘 쓰는 기록이 내년의 이 페이지를 채워 줄 거예요.</div></div>}

      {data && !empty && (
        <div className="grid2" style={{ alignItems: 'start' }}>
          <section className="card">
            <h2>그날의 회고</h2>
            {daily ? (
              <div className="stack">
                {daily.mood && <span className="pill" style={{ alignSelf: 'flex-start' }}>컨디션 {daily.mood}</span>}
                {daily.good && <div><b>잘한 것</b><div>{daily.good}</div></div>}
                {daily.bad && <div><b>아쉬운 것</b><div>{daily.bad}</div></div>}
                {daily.next && <div><b>다음에 할 것</b><div>{daily.next}</div></div>}
                {daily.free && <div><b>생각 정리</b><div style={{ whiteSpace: 'pre-wrap' }}>{daily.free}</div></div>}
              </div>
            ) : <div className="empty">회고는 없어요.</div>}
          </section>
          <div className="stack" style={{ gap: 14 }}>
            <section className="card">
              <h2>그날의 퀘스트</h2>
              {data.quests.length === 0 && <div className="empty">퀘스트는 없어요.</div>}
              {data.quests.map((q) => (
                <div key={q.id} className="row"><span>{q.kind === 'main' && <b>메인 · </b>}{q.title}</span><span className="pill">{q.status === 'done' ? '완료' : '미완료'}</span></div>
              ))}
            </section>
            <section className="card">
              <h2>습관 · 다이어트</h2>
              {data.logs.map((l) => <div key={l.id} className="row"><span>{l.title}</span><span className="pill">{l.level === 'mini' ? 'Mini' : l.level === 'more' ? 'More' : 'Max'}</span></div>)}
              {data.diet && <div className="mut">물 {data.diet.water_cups}잔{data.diet.steps ? ` · ${data.diet.steps.toLocaleString()}보` : ''}{data.diet.weight ? ` · ${data.diet.weight}kg` : ''}</div>}
              {!data.logs.length && !data.diet && <div className="empty">기록이 없어요.</div>}
            </section>
            {data.ideas.length > 0 && (
              <section className="card">
                <h2>그날 떠올린 아이디어</h2>
                {data.ideas.map((i) => <div key={i.id}>{i.body}</div>)}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function PastPage() {
  return <Suspense fallback={<div className="loader" aria-label="불러오는 중"></div>}><PastInner /></Suspense>;
}
