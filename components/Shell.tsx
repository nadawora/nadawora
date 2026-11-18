'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { sb } from '@/lib/supabase';
import { useWs } from '@/lib/workspace';
import IdeaFab from './IdeaFab';

const NAV = [
  { href: '/', label: '오늘', icon: 'M4 11l8-7 8 7v9H4z' },
  { href: '/retro', label: '회고', icon: 'M5 4h14v16H5zM9 9h6M9 13h6' },
  { href: '/diet', label: '다이어트', icon: 'M4 18l5-6 4 3 7-9' },
  { href: '/goals', label: '목표·습관', icon: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z' },
  { href: '/ideas', label: '아이디어', icon: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z' },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { email } = useWs();
  const on = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <div className="app">
      <nav className="side" aria-label="메인 메뉴">
        <div className="logo">minadaum</div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={'nav' + (on(n.href) ? ' on' : '')}>{n.label}</Link>
        ))}
        <Link href="/tasks" className={'nav' + (on('/tasks') ? ' on' : '')}>업무 대시보드</Link>
        <Link href="/office" className={'nav' + (on('/office') ? ' on' : '')}>AI 오피스</Link>
        <Link href="/past" className={'nav' + (on('/past') ? ' on' : '')}>1년 전 오늘</Link>
        <div className="foot">
          <span>{email}</span>
          <button className="btn ghost sm" onClick={() => sb().auth.signOut()}>로그아웃</button>
        </div>
      </nav>
      <main className="main">{children}</main>
      <nav className="tabbar" aria-label="하단 메뉴">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={on(n.href) ? 'on' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
            {n.label}
          </Link>
        ))}
      </nav>
      <IdeaFab />
    </div>
  );
}
