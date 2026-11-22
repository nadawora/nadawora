'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { sb, OPEN_MODE } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';

// 0단계 메뉴: 퀘스트와 다이어리만. 나머지 화면(나다움오피, 목표·습관, 아이디어, 다이어트, 1년 전 오늘)은 코드는 두고 메뉴에서만 숨겨요.
const NAV = [
  { href: '/', label: '퀘스트', icon: 'M5 4h14v16H5zM9 9l2 2 4-4M9 15h6' },
  { href: '/retro', label: '다이어리', icon: 'M6 3h11a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h8M8 12h8M8 16h5' },
]

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { email } = useWs();
  const on = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <div className="app">
      <nav className="side" aria-label="메인 메뉴">
        <div className="logo">나다워라<small>NADAWORA</small></div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={'nav' + (on(n.href) ? ' on' : '')}>{n.label}</Link>
        ))}
        {!OPEN_MODE && (
          <div className="foot">
            <span>{email}</span>
            <button className="btn ghost sm" onClick={() => sb().auth.signOut()}>로그아웃</button>
          </div>
        )}
      </nav>
      <main className="main">
        <header className="motto" aria-label="나다워라의 표어">
          <span className="motto-brand">나다워라</span>
          <span className="motto-text"><i aria-hidden="true" />MAKE IT REAL.</span>
        </header>
        {children}
      </main>
      <nav className="tabbar" aria-label="하단 메뉴">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={on(n.href) ? 'on' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
