-- 004_add_fitness_goals.sql
-- Add fitness goals table for target weight, training, cardio and nutrition goals.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.fitness_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null,
  target_value numeric not null,
  unit text not null,
  period text not null,
  start_date date not null,
  end_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fitness_goals_goal_type_check check (
    goal_type in (
      'target_weight_kg',
      'weekly_strength_sessions',
      'weekly_cardio_minutes',
      'daily_calories',
      'daily_protein_g',
      'daily_carbs_g',
      'daily_fat_g'
    )
  ),
  constraint fitness_goals_period_check check (
    period in (
      'daily',
      'weekly',
      'monthly',
      'date_range',
      'current'
    )
  ),
  constraint fitness_goals_status_check check (
    status in (
      'active',
      'paused',
      'completed',
      'archived'
    )
  ),
  constraint fitness_goals_target_value_positive check (target_value > 0),
  constraint fitness_goals_end_date_check check (
    end_date is null or end_date >= start_date
  )
);

create index if not exists fitness_goals_user_id_idx
  on public.fitness_goals(user_id);

create index if not exists fitness_goals_goal_type_idx
  on public.fitness_goals(goal_type);

create index if not exists fitness_goals_status_idx
  on public.fitness_goals(status);

create index if not exists fitness_goals_user_id_status_idx
  on public.fitness_goals(user_id, status);

create index if not exists fitness_goals_user_id_goal_type_idx
  on public.fitness_goals(user_id, goal_type);

drop trigger if exists set_fitness_goals_updated_at on public.fitness_goals;

create trigger set_fitness_goals_updated_at
before update on public.fitness_goals
for each row
execute function public.set_updated_at();

alter table public.fitness_goals enable row level security;

drop policy if exists "fitness_goals_select_own" on public.fitness_goals;
create policy "fitness_goals_select_own"
on public.fitness_goals
for select
using (user_id = auth.uid());

drop policy if exists "fitness_goals_insert_own" on public.fitness_goals;
create policy "fitness_goals_insert_own"
on public.fitness_goals
for insert
with check (user_id = auth.uid());

drop policy if exists "fitness_goals_update_own" on public.fitness_goals;
create policy "fitness_goals_update_own"
on public.fitness_goals
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "fitness_goals_delete_own" on public.fitness_goals;
create policy "fitness_goals_delete_own"
on public.fitness_goals
for delete
using (user_id = auth.uid());
