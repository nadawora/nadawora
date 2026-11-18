export type Level = 'mini' | 'more' | 'max';

export interface Topic { id: string; name: string; color: string; sort: number }
export interface Goal { id: string; topic_id: string | null; title: string; why: string | null; horizon: 'dream' | 'year' | 'month'; due_date: string | null; progress: number; status: 'active' | 'done' | 'paused' }
export interface Habit { id: string; topic_id: string | null; title: string; mini: string; more: string; max: string; active: boolean; sort: number }
export interface HabitLog { id: string; habit_id: string; log_date: string; level: Level }
export interface Quest { id: string; title: string; kind: 'main' | 'sub'; quest_date: string; status: 'open' | 'done' | 'dropped'; topic_id: string | null; carried_count: number; done_at: string | null }
export interface Retro { id?: string; kind: 'daily' | 'weekly' | 'monthly'; period_start: string; mood: number | null; good: string | null; bad: string | null; next: string | null; free: string | null }
export interface DietLog { id?: string; log_date: string; weight: number | null; water_cups: number; steps: number | null; meals: Record<string, string>; memo: string | null }
export interface Idea { id: string; body: string; topic_id: string | null; status: 'inbox' | 'doing' | 'kept' | 'dropped'; created_at: string }

export const LEVEL_LABEL: Record<Level, string> = { mini: 'Mini', more: 'More', max: 'Max' };
