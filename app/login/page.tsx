'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, isConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isConfigured()) return;
    sb().auth.getSession().then(({ data }) => { if (data.session) router.replace('/'); });
    const { data: sub } = sb().auth.onAuthStateChange((_e, s) => { if (s) router.replace('/'); });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!isConfigured()) { setErr('아직 Supabase가 연결되지 않았어요.'); return; }
    setBusy(true);
    const { error } = await sb().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div className="center-msg">
      <form className="card" style={{ width: '100%' }} onSubmit={send}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>나다워라</div>
        <div className="motto-login">MAKE IT REAL</div>
        {sent ? (
          <div className="card flat"><b>메일함을 확인해 주세요</b><span className="mut">{email} 으로 로그인 링크를 보냈어요. 링크를 누르면 바로 들어와요.</span></div>
        ) : (
          <>
            <label className="f">이메일
              <input className="in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" autoComplete="email" />
            </label>
            <button className="btn" disabled={busy}>로그인 링크 받기</button>
            <span className="mut">비밀번호 없이, 메일로 온 링크를 눌러 로그인해요.</span>
          </>
        )}
        {err && <span style={{ color: '#C92A2A', fontSize: 13 }}>{err}</span>}
      </form>
    </div>
  );
}
