# minadaum

나다움을 시스템으로 관리하는 웹사이트. 오늘의 퀘스트, Mini·More·Max 습관, 회고, 1년 전 오늘, 다이어트, 목표, 아이디어 보관함, 업무 대시보드, AI 오피스, 슬랙 알림.

## 구성

- 화면: Next.js (Vercel에 배포)
- 데이터: Supabase (Postgres + 로그인). 개인 데이터는 여기에만 저장되고 GitHub에는 올라가지 않아요.
- 알림: 슬랙 Incoming Webhook + Vercel Cron (아침 8시대, 저녁 9시대)

## 메뉴

| 메뉴 | 하는 일 |
|---|---|
| 오늘 | 메인 퀘스트 1개, 서브 퀘스트, 습관(Mini·More·Max), 다이어트 빠른 기록, 레벨·경험치, 힘든 날 모드, 지난 퀘스트 넘기기·내려놓기 |
| 회고 | 일일(컨디션·잘한 것·아쉬운 것·내일 할 것·생각 정리) / 주간·월간(자동 요약 포함) |
| 1년 전 오늘 | 1·2·3년 전 같은 날의 회고, 퀘스트, 습관, 다이어트, 아이디어 |
| 다이어트 | 체중·걸음·물·식단 기록, 체중 흐름, 걸음 그래프 |
| 목표·습관 | 주제별 목표(꿈·올해·이번 달)와 진행률, 습관 추가·수정 |
| 아이디어 | 어디서든 + 버튼으로 기록, 검색·주제·상태 정리, 오늘 퀘스트로 보내기 |
| 업무 대시보드 | 업무 정의(목적·완료 기준·마감), 사람이나 AI 직원에게 할당, 진행 보드, 결과물·감사 점수, 결정 대기 |
| AI 오피스 | 3D 사무실. 진행 중인 업무가 있는 직원은 자리에서, 없으면 카페테리아에서 쉬어요 |

## 연결 순서

### 1. Supabase
1. 새 프로젝트를 만들어요 (지역: Seoul).
2. 왼쪽 **SQL Editor** → New query → `supabase/schema.sql` 내용을 전부 붙여넣고 **Run**.
3. **Authentication → URL Configuration**에서 Site URL을 Vercel 주소(예: `https://minadaum.vercel.app`)로 바꿔요. 로컬에서 쓸 때는 Redirect URLs에 `http://localhost:3000`도 추가해요.
4. **Project Settings → API Keys**에서 아래 값을 확인해요.
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon (또는 publishable) 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role (또는 secret) 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 공개 금지)

### 2. 슬랙
1. https://api.slack.com/apps → Create New App → From scratch → 이름 `minadaum 비서`, 내 워크스페이스 선택.
2. **Incoming Webhooks** 켜기 → Add New Webhook → 알림 받을 채널(예: `#비서-코치`) 선택.
3. 만들어진 Webhook URL → `SLACK_WEBHOOK_URL`

### 3. Vercel
1. Add New → Project → GitHub의 `minadaum` 저장소 Import.
2. Environment Variables에 아래 값을 넣고 Deploy.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_WEBHOOK_URL`
   - `CRON_SECRET`: 아무 긴 문자열 (알림 주소를 남이 못 부르게 막는 값)
   - `SITE_URL`: 배포된 주소 (슬랙 메시지의 링크용)
3. 알림 테스트: Vercel 프로젝트 → Settings → Cron Jobs → 각 작업의 **Run**.

### 4. 첫 로그인
사이트에서 이메일을 넣고 메일로 온 링크를 누르면, 기본 주제 5개, 습관 4개, AI 직원 5명이 자동으로 만들어져요.
혼자 쓸 거라면 첫 로그인 뒤 Supabase **Authentication → Sign In / Providers**에서 새 가입(Allow new users to sign up)을 꺼 두세요.

## 알아 둘 것
- Vercel 무료 요금제의 예약 작업은 하루 1번씩, 정해진 시각부터 1시간 안에 실행돼요. 그래서 알림은 아침 8시대, 저녁 9시대에 와요.
- AI 직원이 실제로 일하는 기능(업무 수행, 회의, 감사)은 Claude·OpenAI API 키를 연결하는 2차 작업이에요. 데이터 구조(`tasks`, `decisions`, AI `members`)는 이미 준비돼 있어요.
- 3D 오피스의 가구와 캐릭터는 도형으로 만든 임시 모델이에요. 무료(CC0) 에셋으로 바꿀 수 있어요.

## 로컬 실행
```
cp .env.example .env.local   # 값 채우기
npm install
npm run dev
```
