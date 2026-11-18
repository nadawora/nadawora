import { adminDb, authorized, slack, siteUrl, section } from '@/lib/server';
import { todayKST } from '@/lib/date';

export const dynamic = 'force-dynamic';

// 매일 저녁 (한국 시간 9시대): 오늘 한 일을 정리하고 회고를 권해요.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response('unauthorized', { status: 401 });
  const db = adminDb();
  const today = todayKST();
  const url = siteUrl(req);
  const { data: owners } = await db.from('members').select('id, workspace_id').eq('kind', 'human').eq('is_owner', true);
  const results = [];
  for (const o of owners || []) {
    const [done, open, habits, logs, retro, diet] = await Promise.all([
      db.from('quests').select('id', { count: 'exact', head: true }).eq('workspace_id', o.workspace_id).eq('quest_date', today).eq('status', 'done'),
      db.from('quests').select('title').eq('workspace_id', o.workspace_id).eq('quest_date', today).eq('status', 'open'),
      db.from('habits').select('id', { count: 'exact', head: true }).eq('workspace_id', o.workspace_id).eq('active', true),
      db.from('habit_logs').select('id', { count: 'exact', head: true }).eq('workspace_id', o.workspace_id).eq('log_date', today),
      db.from('retros').select('id').eq('member_id', o.id).eq('kind', 'daily').eq('period_start', today).maybeSingle(),
      db.from('diet_logs').select('id').eq('member_id', o.id).eq('log_date', today).maybeSingle(),
    ]);
    const lines = [
      '*오늘 하루 수고 많았어요.*',
      `완료한 퀘스트 ${done.count || 0}개 · 습관 ${logs.count || 0}/${habits.count || 0}`,
    ];
    if (open.data?.length) lines.push(`남은 퀘스트: ${open.data.map((q) => q.title).join(', ')} (내일로 넘기거나 내려놓아도 괜찮아요)`);
    if (!diet.data) lines.push('오늘 다이어트 기록이 아직 없어요. 물과 걸음만 적어도 돼요.');
    lines.push(retro.data ? '오늘 회고도 이미 썼네요. 잘했어요.' : '자기 전에 회고 한 줄 남겨 볼까요? 한 줄이면 Mini 성공이에요.');
    lines.push(`<${url}/retro|회고 쓰러 가기>`);
    results.push(await slack(lines.join('\n'), [section(lines.join('\n'))]));
  }
  return Response.json({ ok: true, sent: results.length, results });
}
