-- Workout template schema for daily fitness tracker.
-- Authentication users are managed by Supabase Auth in auth.users.
-- This file intentionally does not create a public users table and does not store password hashes.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    execute $fn$
      create function public.set_updated_at()
      returns trigger
      language plpgsql
      as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$;
    $fn$;
  end if;
end
$$;

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_name_snapshot text not null check (btrim(exercise_name_snapshot) <> ''),
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_template_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_exercise_id uuid not null references public.workout_template_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  target_weight_kg numeric(8, 2) check (target_weight_kg is null or target_weight_kg >= 0),
  target_reps integer check (target_reps is null or target_reps > 0),
  is_warmup boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workout_templates_user_id
  on public.workout_templates(user_id);

create index if not exists idx_workout_template_exercises_user_id
  on public.workout_template_exercises(user_id);

create index if not exists idx_workout_template_exercises_template_id
  on public.workout_template_exercises(template_id);

create index if not exists idx_workout_template_sets_user_id
  on public.workout_template_sets(user_id);

create index if not exists idx_workout_template_sets_template_exercise_id
  on public.workout_template_sets(template_exercise_id);

drop trigger if exists set_workout_templates_updated_at on public.workout_templates;
create trigger set_workout_templates_updated_at
before update on public.workout_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_workout_template_exercises_updated_at on public.workout_template_exercises;
create trigger set_workout_template_exercises_updated_at
before update on public.workout_template_exercises
for each row execute function public.set_updated_at();

drop trigger if exists set_workout_template_sets_updated_at on public.workout_template_sets;
create trigger set_workout_template_sets_updated_at
before update on public.workout_template_sets
for each row execute function public.set_updated_at();

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_template_sets enable row level security;

drop policy if exists workout_templates_select_own on public.workout_templates;
create policy workout_templates_select_own
on public.workout_templates
for select
using (user_id = auth.uid());

drop policy if exists workout_templates_insert_own on public.workout_templates;
create policy workout_templates_insert_own
on public.workout_templates
for insert
with check (user_id = auth.uid());

drop policy if exists workout_templates_update_own on public.workout_templates;
create policy workout_templates_update_own
on public.workout_templates
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workout_templates_delete_own on public.workout_templates;
create policy workout_templates_delete_own
on public.workout_templates
for delete
using (user_id = auth.uid());

drop policy if exists workout_template_exercises_select_own on public.workout_template_exercises;
create policy workout_template_exercises_select_own
on public.workout_template_exercises
for select
using (user_id = auth.uid());

drop policy if exists workout_template_exercises_insert_own on public.workout_template_exercises;
create policy workout_template_exercises_insert_own
on public.workout_template_exercises
for insert
with check (user_id = auth.uid());

drop policy if exists workout_template_exercises_update_own on public.workout_template_exercises;
create policy workout_template_exercises_update_own
on public.workout_template_exercises
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workout_template_exercises_delete_own on public.workout_template_exercises;
create policy workout_template_exercises_delete_own
on public.workout_template_exercises
for delete
using (user_id = auth.uid());

drop policy if exists workout_template_sets_select_own on public.workout_template_sets;
create policy workout_template_sets_select_own
on public.workout_template_sets
for select
using (user_id = auth.uid());

drop policy if exists workout_template_sets_insert_own on public.workout_template_sets;
create policy workout_template_sets_insert_own
on public.workout_template_sets
for insert
with check (user_id = auth.uid());

drop policy if exists workout_template_sets_update_own on public.workout_template_sets;
create policy workout_template_sets_update_own
on public.workout_template_sets
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workout_template_sets_delete_own on public.workout_template_sets;
create policy workout_template_sets_delete_own
on public.workout_template_sets
for delete
using (user_id = auth.uid());
