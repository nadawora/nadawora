'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { sb, isConfigured, OPEN_MODE } from './supabase';
import type { Topic } from './types';

interface Ws {
  userId: string;
  email: string;
  wsId: string;
  memberId: string;
  topics: Topic[];
  reloadTopics: () => Promise<void>;
  bump: () => void;
  version: number;
}

const Ctx = createContext<Ws | null>(null);

export function useWs(): Ws {
  const v = useContext(Ctx);
  if (!v) throw new Error('WorkspaceProvider 밖에서 쓰였어요');
  return v;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<Omit<Ws, 'reloadTopics' | 'bump' | 'version'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    if (!isConfigured()) { setError('아직 Supabase가 연결되지 않았어요. README의 연결 순서를 따라 환경 변수를 넣어 주세요.'); return; }
    const db = sb();
    if (OPEN_MODE) {
      // 로그인 없이: 주인 구성원(대표)의 워크스페이스를 그대로 써요.
      const { data: owner, error: oe } = await db.from('members').select('id, workspace_id').eq('kind', 'human').eq('is_owner', true).order('created_at').limit(1).maybeSingle();
      if (oe) { setError('불러오는 중 문제가 생겼어요: ' + oe.message); return; }
      if (!owner) { setError('주인 워크스페이스가 아직 없어요. 한 번은 로그인해서 만들어야 해요.'); return; }
      const { data: topics } = await db.from('topics').select('id, name, color, sort').eq('workspace_id', owner.workspace_id).order('sort');
      setState({ userId: '', email: '', wsId: owner.workspace_id, memberId: owner.id, topics: (topics || []) as Topic[] });
      return;
    }
    const { data: s } = await db.auth.getSession();
    const user = s.session?.user;
    if (!user) { router.replace('/login'); return; }
    let { data: mem } = await db.from('members').select('id, workspace_id').eq('user_id', user.id).eq('kind', 'human').limit(1).maybeSingle();
    if (!mem) {
      const { error: e } = await db.rpc('bootstrap_workspace');
      if (e) {
        if (/sign-up closed/.test(e.message)) { setError('이 사이트는 주인 계정만 쓸 수 있어요. 다른 계정으로는 가입할 수 없어요.'); return; }
        setError('처음 설정 중 문제가 생겼어요: ' + e.message); return;
      }
      const again = await db.from('members').select('id, workspace_id').eq('user_id', user.id).eq('kind', 'human').limit(1).maybeSingle();
      mem = again.data;
    }
    if (!mem) { setError('구성원 정보를 찾지 못했어요.'); return; }
    const { data: topics } = await db.from('topics').select('id, name, color, sort').eq('workspace_id', mem.workspace_id).order('sort');
    setState({ userId: user.id, email: user.email || '', wsId: mem.workspace_id, memberId: mem.id, topics: (topics || []) as Topic[] });
  }, [router]);

  useEffect(() => {
    load();
    if (!isConfigured() || OPEN_MODE) return;
    const { data: sub } = sb().auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') router.replace('/login'); });
    return () => sub.subscription.unsubscribe();
  }, [load, router]);

  const reloadTopics = useCallback(async () => {
    if (!state) return;
    const { data } = await sb().from('topics').select('id, name, color, sort').eq('workspace_id', state.wsId).order('sort');
    setState({ ...state, topics: (data || []) as Topic[] });
  }, [state]);

  if (error) return (
    <div className="center-msg"><div className="card"><h2>들어갈 수 없어요</h2><p className="mut">{error}</p>
      {isConfigured() && !OPEN_MODE && <button className="btn ghost sm" onClick={() => sb().auth.signOut()}>로그아웃</button>}
    </div></div>
  );
  if (!state) return <div className="center-msg"><div className="loader" aria-label="불러오는 중"></div></div>;
  return <Ctx.Provider value={{ ...state, reloadTopics, bump: () => setVersion((v) => v + 1), version }}>{children}</Ctx.Provider>;
}
