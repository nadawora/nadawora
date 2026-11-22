# 로그인 모드

## 지금: 임시 공개 모드 (2026-11-22부터)
- 로그인 없이 사이트를 열면 바로 주인 워크스페이스가 열려요.
- 켜는 법: Vercel 환경 변수 `NEXT_PUBLIC_OPEN_MODE=1` + Supabase 정책 "open mode"(비로그인 사용자 읽기·쓰기 허용).
- 주의: 주소를 아는 사람은 누구나 보고 고칠 수 있어요. 개인적인 일기·재정 기록을 넣기 전에 로그인을 다시 켜요.

## 로그인 다시 켜기
1. Supabase SQL Editor에서 실행
   ```sql
   do $$
   declare t text;
   begin
     foreach t in array array['workspaces','members','topics','goals','habits','habit_logs','quests','retros','diet_logs','ideas','tasks','decisions'] loop
       execute format('drop policy if exists "open mode" on public.%I', t);
     end loop;
   end $$;
   ```
2. Vercel에서 `NEXT_PUBLIC_OPEN_MODE` 환경 변수를 지우고 다시 배포해요.
3. 다음 로그인 방식(기획안): 이메일 링크 대신 6자리 인증번호 + 기기별 로그인 유지.
