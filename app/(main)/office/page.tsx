'use client';
import { useEffect, useRef, useState } from 'react';
import QuestPanel from '@/components/QuestPanel';

// 나다움오피: 지금은 AI 직원이 없는 빈 사무실이에요.
// (AI 직원 채용·대화·회의 기능은 다음 단계에서 붙여요. 예전에 만들어진 AI 구성원 데이터는 지우지 않고 화면에만 보여 주지 않아요.)
export default function OfficePage() {
  const wrap = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    let office: { update: (s: unknown[], m: boolean, r: boolean) => void; dispose: () => void } | null = null;
    import('@/lib/office3d').then(({ mountOffice }) => {
      if (!alive || !wrap.current || !overlay.current) return;
      try {
        office = mountOffice(wrap.current, overlay.current);
        office.update([], false, false);
      } catch (e) { setErr('이 기기에서는 3D 화면을 그릴 수 없어요: ' + String(e)); }
    });
    return () => { alive = false; office?.dispose(); };
  }, []);

  return (
    <>
      <div className="row wrap">
        <div><div className="mut">나다워라의 작은 사무실</div><h1>나다움오피</h1></div>
        <span className="pill" data-testid="staff-count">AI 직원 0명</span>
      </div>
      {err && <div className="card warn">{err}</div>}
      <div className="office-wrap">
        <div ref={wrap} className="stage3d" data-testid="office-stage">
          <div ref={overlay} className="labels3d" />
          <div className="office-empty" aria-live="polite">아직 함께 일하는 직원이 없어요.<br />오늘은 나 혼자, 내 퀘스트부터.</div>
        </div>
        <QuestPanel />
      </div>
    </>
  );
}
