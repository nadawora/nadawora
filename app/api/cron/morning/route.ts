import { adminDb, authorized, slack, siteUrl, section } from '@/lib/server';
import { todayKST, fmtLong, addYears } from '@/lib/date';

export const dynamic = 'force-dynamic';

// 매일 아침 (한국 시간 8시대): 비서·코치가 오늘의 브리핑을 슬랙으로 보내요.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response('unauthorized', { status: 401 });
  const db = adminDb();
  const today = todayKST();
  const url = siteUrl(req);
  const { data: owners } = await db.from('members').select('id, workspace_id').eq('kind', 'human').eq('is_owner', true);
  const results = [];
  for (const o of owners || []) {
    const [main, subs, overdue, habits, decisions, lastYear] = await Promise.all([
      db.from('quests').select('title').eq('workspace_id', o.workspace_id).eq('quest_date', today).eq('kind', 'main').neq('status', 'dropped').maybeSingle(),
      db.from('quests').select('id', { count: 'exact', head: true }).eq('workspace_id', o.workspace_id).eq('quest_date', today).eq('kind', 'sub').eq('status', 'open'),
      db.from('quests').select('id', { count: 'exact', head: true }).eq('workspace_id', o.workspace_id).lt('quest_date', today).eq('status', 'open'),
      db.from('habits').select('title, mini').eq('workspace_id', o.workspace_id).eq('active', true).order('sort'),
      db.from('decisions').select('id', { count: 'exact', head: true }).eq('workspace_id', o.workspace_id).eq('status', 'pending'),
      db.from('retros').select('good, free').eq('member_id', o.id).eq('kind', 'daily').eq('period_start', addYears(today, -1)).maybeSingle(),
    ]);
    const lines = [
      `*좋은 아침이에요, 대표님.* ${fmtLong(today)}`,
      main.data ? `오늘의 메인 퀘스트는 *${main.data.title}* 이에요.` : '아직 오늘의 메인 퀘스트가 없어요. 가장 중요한 한 가지를 정해 주세요.',
    ];
    if (subs.count) lines.push(`서브 퀘스트 ${subs.count}개가 기다리고 있어요.`);
    if (overdue.count) lines.push(`지난 퀘스트 ${overdue.count}개가 남아 있어요. 넘길지 내려놓을지 정해 주세요.`);
    if (habits.data?.length) lines.push(`오늘의 습관 (Mini만 해도 성공): ${habits.data.map((h) => `${h.title} ${h.mini}`).join(' · ')}`);
    if (decisions.count) lines.push(`:bell: 결정을 기다리는 일이 ${decisions.count}건 있어요.`);
    if (lastYear.data) lines.push(`1년 전 오늘의 나: "${(lastYear.data.good || lastYear.data.free || '').slice(0, 80)}"`);
    lines.push(`<${url}|minadaum 열기>`);
    results.push(await slack(lines.join('\n'), [section(lines.join('\n'))]));
  }
  return Response.json({ ok: true, sent: results.length, results });
}
