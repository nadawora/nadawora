-- minadaum 데이터베이스
-- Supabase → SQL Editor → New query 에 이 파일 전체를 붙여넣고 Run 하세요.
-- 구조: 워크스페이스(회사) → 구성원(사람·AI) → 주제·목표·습관·퀘스트·회고·다이어트·아이디어·업무
-- 나중에 다른 사람을 초대하거나 서비스로 키워도 그대로 쓸 수 있게 모든 데이터에 workspace_id 가 붙어 있어요.

create extension if not exists pgcrypto;

-- ───────── 워크스페이스와 구성원 ─────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('human', 'ai')),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text,
  ai_model text,              -- 'claude' | 'gpt' (AI 구성원만)
  color text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists members_ws_user on public.members(workspace_id, user_id) where user_id is not null;

-- ───────── 주제 · 목표 ─────────
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#2F5FE0',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  why text,
  horizon text not null default 'year' check (horizon in ('dream', 'year', 'month')),
  due_date date,
  progress int not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active', 'done', 'paused')),
  created_at timestamptz not null default now()
);

-- ───────── 습관 (Mini · More · Max) ─────────
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  mini text not null,
  more text not null,
  max text not null,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  level text not null check (level in ('mini', 'more', 'max')),
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index if not exists habit_logs_date on public.habit_logs(workspace_id, log_date);

-- ───────── 퀘스트 (오늘 할 일) ─────────
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  kind text not null default 'sub' check (kind in ('main', 'sub')),
  quest_date date not null,
  status text not null default 'open' check (status in ('open', 'done', 'dropped')),
  done_at timestamptz,
  carried_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quests_date on public.quests(workspace_id, quest_date);

-- ───────── 회고 ─────────
create table if not exists public.retros (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('daily', 'weekly', 'monthly')),
  period_start date not null,
  mood int check (mood between 1 and 5),
  good text,
  bad text,
  next text,
  free text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, kind, period_start)
);

-- ───────── 다이어트 ─────────
create table if not exists public.diet_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  log_date date not null,
  weight numeric(5, 1),
  water_cups int not null default 0,
  steps int,
  meals jsonb not null default '{}'::jsonb,
  memo text,
  created_at timestamptz not null default now(),
  unique (member_id, log_date)
);

-- ───────── 아이디어 보관함 ─────────
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  body text not null,
  topic_id uuid references public.topics(id) on delete set null,
  status text not null default 'inbox' check (status in ('inbox', 'doing', 'kept', 'dropped')),
  created_at timestamptz not null default now()
);

-- ───────── 업무 (2차: AI 오피스용, 구조만 먼저) ─────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  purpose text,
  done_criteria text,
  topic_id uuid references public.topics(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  assignee_id uuid references public.members(id) on delete set null,   -- 사람 또는 AI
  created_by uuid references public.members(id) on delete set null,
  priority int not null default 2,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  result text,
  cost_krw int not null default 0,
  audit_score int,
  audit_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  asked_by uuid references public.members(id) on delete set null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answer text,
  status text not null default 'pending' check (status in ('pending', 'answered')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

-- ───────── 보안: 같은 워크스페이스 구성원만 읽고 쓰기 ─────────
create or replace function public.is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where workspace_id = ws and user_id = auth.uid());
$$;

alter table public.workspaces enable row level security;
drop policy if exists "member access" on public.workspaces;
create policy "member access" on public.workspaces for all using (public.is_member(id)) with check (public.is_member(id));

do $$
declare t text;
begin
  foreach t in array array['members','topics','goals','habits','habit_logs','quests','retros','diet_logs','ideas','tasks','decisions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "member access" on public.%I', t);
    execute format('create policy "member access" on public.%I for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id))', t);
  end loop;
end $$;

-- ───────── 첫 로그인 때 기본 데이터 만들기 ─────────
create or replace function public.bootstrap_workspace()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  ws uuid; me uuid;
  t_health uuid; t_work uuid; t_biz uuid; t_ai uuid; t_rec uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select workspace_id into ws from public.members where user_id = auth.uid() limit 1;
  if ws is not null then return ws; end if;

  insert into public.workspaces(name) values ('minadaum') returning id into ws;
  insert into public.members(workspace_id, kind, user_id, name, role, is_owner, color)
    values (ws, 'human', auth.uid(), '대표', '대표', true, '#191F28') returning id into me;
  insert into public.members(workspace_id, kind, name, role, ai_model, color) values
    (ws, 'ai', '비서·코치', '비서·코치', 'claude', '#E8590C'),
    (ws, 'ai', '매니저', '매니저', 'claude', '#3B5BDB'),
    (ws, 'ai', '직원 1', '직원', 'gpt', '#2F9E44'),
    (ws, 'ai', '직원 2', '직원', 'gpt', '#7048E8'),
    (ws, 'ai', '감사', '감사', 'claude', '#495057');

  insert into public.topics(workspace_id, name, color, sort) values (ws, '건강·다이어트', '#2F9E44', 1) returning id into t_health;
  insert into public.topics(workspace_id, name, color, sort) values (ws, '일·커리어', '#3B5BDB', 2) returning id into t_work;
  insert into public.topics(workspace_id, name, color, sort) values (ws, '사업', '#E8590C', 3) returning id into t_biz;
  insert into public.topics(workspace_id, name, color, sort) values (ws, 'AI·성장', '#7048E8', 4) returning id into t_ai;
  insert into public.topics(workspace_id, name, color, sort) values (ws, '기록', '#495057', 5) returning id into t_rec;

  insert into public.habits(workspace_id, member_id, topic_id, title, mini, more, max, sort) values
    (ws, me, t_rec, '회고 쓰기', '한 줄', '잘한 것·아쉬운 것·내일 할 것', '생각 정리까지', 1),
    (ws, me, t_ai, 'AI 실험', '질문 하나 해 보기', '작은 결과물 하나', '블로그 글까지', 2),
    (ws, me, t_health, '걷기', '10분', '30분', '1시간', 3),
    (ws, me, t_health, '물 마시기', '4잔', '6잔', '8잔', 4);

  return ws;
end $$;

grant execute on function public.bootstrap_workspace() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
