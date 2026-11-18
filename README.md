# 나다워라 NADAWORA 1.0

**MAKE IT REAL.** 45세에 이루고 싶은 삶을 향해 매일 계획하고, 실천하고, 기록하는 개인 자기관리 시스템이에요.
1.0의 핵심 흐름은 **하루 계획 → 퀘스트 실행 → 완료 → 하루 회고**예요.

## 구성

- 화면: Next.js 16 + React 19 + TypeScript (Vercel 배포)
- 데이터: Supabase (Postgres + 메일 링크 로그인 + RLS). 개인 데이터는 Supabase에만 저장되고 GitHub에는 올라가지 않아요.
- 알림(선택): 슬랙 Incoming Webhook + Vercel Cron

## 1.0 메뉴

| 메뉴 | 하는 일 |
|---|---|
| 오늘 | 날짜 이동, 메인 퀘스트 1개(같은 날 중복 불가), 서브 퀘스트 추가·수정·삭제, 메인 바꾸기, 지난 미완료 퀘스트 오늘로 이월, 전체·완료·달성률, 완료 효과와 경험치·레벨, 습관(Mini·More·Max), 힘든 날 모드, 다이어트 빠른 기록 |
| 회고 | 일일: 잘한 일·아쉬웠던 일·내일 가장 중요한 일·일기·컨디션(날짜별 저장·수정), 내일 퀘스트로 등록 / 주간·월간 |
| 나다움오피 | 3D 사무실(AI 직원 0명), 오른쪽 아래 오늘의 퀘스트 패널 |
| 목표·습관, 아이디어, 다이어트, 1년 전 오늘 | 기존 기능 유지 |

보류 기능과 다음 순서는 `docs/PRODUCT_BACKLOG.md`에 있어요. 업무 대시보드(`/tasks`)는 메뉴에서만 숨겼어요.

## 경험치 규칙

메인 +50, 서브 +15, 습관 Mini +10 / More +20 / Max +30, 일일 회고 +20, 다이어트 기록 +10. 레벨은 300 XP마다 올라요.
경험치는 "지금 완료 상태인 기록"으로 계산해서, 완료·취소를 반복해도 중복으로 쌓이지 않아요. 완료한 퀘스트를 삭제하면 그 경험치도 빠져요.

## 연결 순서

### 1. Supabase
1. 프로젝트를 만들어요 (지역: Seoul 권장).
2. **SQL Editor** → New query → `supabase/schema.sql` 전체를 붙여넣고 **Run**. 여러 번 실행해도 안전해요.
3. **Authentication → URL Configuration**: Site URL을 배포 주소로, Redirect URLs에 배포 주소를 추가해요.
4. 첫 로그인(아래 4번)을 마친 뒤 **Authentication → Sign In / Providers → User Signups**에서 "Allow new users to sign up"을 꺼요.

### 2. Vercel 환경 변수
| 이름 | 값 | 공개 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | 브라우저에 공개돼도 되는 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon(publishable) 키 | 브라우저에 공개돼도 되는 값 (RLS가 보호) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role(secret) 키 | **비밀**. 슬랙 알림을 쓸 때만 필요 |
| `CRON_SECRET` | 16자 이상 임의 문자열 | **비밀**. 없으면 예약 알림 주소가 모두 거절돼요 |
| `SLACK_WEBHOOK_URL` | 슬랙 웹훅 주소 | **비밀**. 선택 |
| `SITE_URL` | 배포 주소 | 선택 |

비밀 값은 GitHub이나 채팅에 올리지 말고 Vercel 화면에만 넣어요.

### 3. 첫 로그인과 가입 제한
사이트에서 이메일을 넣고 메일로 온 링크를 누르면 주인 계정이 만들어지고 기본 주제 5개, 습관 4개가 생겨요. AI 직원은 만들지 않아요.
주인 계정이 생긴 뒤에는 DB가 다른 계정의 워크스페이스 생성을 거절해요. 그래도 Supabase에서 새 가입을 꺼 두면 더 안전해요.

## 보안 요약
- 모든 표에 RLS: 같은 워크스페이스 구성원만 읽고 쓸 수 있어요. 미인증·다른 사용자는 0건.
- 주인 1명 이후 가입 차단(`bootstrap_workspace`), anon은 이 함수를 실행할 수 없어요.
- 예약 실행 API는 `CRON_SECRET`이 있어야만 통과해요(시간 일정 비교).

## 로컬 실행
```
cp .env.example .env.local   # 값 채우기
npm install
npm run dev
```
