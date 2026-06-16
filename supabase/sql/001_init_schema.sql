-- Daily fitness tracker initial Supabase schema.
-- Authentication users are managed by Supabase Auth in auth.users.
-- This file intentionally does not create a public users table and does not store password hashes.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  height_cm numeric(6, 2) check (height_cm is null or height_cm > 0),
  current_weight_kg numeric(6, 2) check (current_weight_kg is null or current_weight_kg > 0),
  target_weight_kg numeric(6, 2) check (target_weight_kg is null or target_weight_kg > 0),
  gender text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mile')),
  week_start_day text not null default 'monday' check (week_start_day in ('monday', 'sunday')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_user_id_unique unique (user_id),
  constraint user_preferences_id_user_id_unique unique (id, user_id)
);

create table if not exists public.strength_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  body_part text,
  equipment text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strength_exercises_id_user_id_unique unique (id, user_id)
);

create table if not exists public.strength_workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strength_workout_sessions_time_check check (
    started_at is null or ended_at is null or ended_at >= started_at
  ),
  constraint strength_workout_sessions_id_user_id_unique unique (id, user_id)
);

create table if not exists public.strength_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid,
  exercise_name_snapshot text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strength_workout_exercises_session_user_fk
    foreign key (session_id, user_id)
    references public.strength_workout_sessions(id, user_id)
    on delete cascade,
  constraint strength_workout_exercises_exercise_user_fk
    foreign key (exercise_id, user_id)
    references public.strength_exercises(id, user_id)
    on delete restrict,
  constraint strength_workout_exercises_id_user_id_unique unique (id, user_id)
);

create table if not exists public.strength_workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(8, 2) not null check (weight_kg >= 0),
  reps integer not null check (reps > 0),
  is_warmup boolean not null default false,
  rpe numeric(4, 2) check (rpe is null or (rpe >= 0 and rpe <= 10)),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strength_workout_sets_exercise_user_fk
    foreign key (workout_exercise_id, user_id)
    references public.strength_workout_exercises(id, user_id)
    on delete cascade
);

create table if not exists public.cardio_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cardio_date date not null,
  activity_type text not null,
  duration_minutes numeric(8, 2) not null check (duration_minutes > 0),
  distance_km numeric(8, 2) check (distance_km is null or distance_km >= 0),
  calories_burned numeric(10, 2) check (calories_burned is null or calories_burned >= 0),
  intensity text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_records_id_user_id_unique unique (id, user_id)
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  calories_per_100g numeric(10, 2) check (calories_per_100g is null or calories_per_100g >= 0),
  protein_per_100g numeric(10, 2) check (protein_per_100g is null or protein_per_100g >= 0),
  carbs_per_100g numeric(10, 2) check (carbs_per_100g is null or carbs_per_100g >= 0),
  fat_per_100g numeric(10, 2) check (fat_per_100g is null or fat_per_100g >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_id_user_id_unique unique (id, user_id)
);

create table if not exists public.meal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_records_id_user_id_unique unique (id, user_id)
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_record_id uuid not null,
  food_id uuid,
  food_name_snapshot text not null,
  amount_g numeric(10, 2) not null check (amount_g > 0),
  calories_snapshot numeric(10, 2) check (calories_snapshot is null or calories_snapshot >= 0),
  protein_g_snapshot numeric(10, 2) check (protein_g_snapshot is null or protein_g_snapshot >= 0),
  carbs_g_snapshot numeric(10, 2) check (carbs_g_snapshot is null or carbs_g_snapshot >= 0),
  fat_g_snapshot numeric(10, 2) check (fat_g_snapshot is null or fat_g_snapshot >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_items_meal_record_user_fk
    foreign key (meal_record_id, user_id)
    references public.meal_records(id, user_id)
    on delete cascade,
  constraint meal_items_food_user_fk
    foreign key (food_id, user_id)
    references public.foods(id, user_id)
    on delete restrict
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_strength_exercises_updated_at on public.strength_exercises;
create trigger set_strength_exercises_updated_at
before update on public.strength_exercises
for each row execute function public.set_updated_at();

drop trigger if exists set_strength_workout_sessions_updated_at on public.strength_workout_sessions;
create trigger set_strength_workout_sessions_updated_at
before update on public.strength_workout_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_strength_workout_exercises_updated_at on public.strength_workout_exercises;
create trigger set_strength_workout_exercises_updated_at
before update on public.strength_workout_exercises
for each row execute function public.set_updated_at();

drop trigger if exists set_strength_workout_sets_updated_at on public.strength_workout_sets;
create trigger set_strength_workout_sets_updated_at
before update on public.strength_workout_sets
for each row execute function public.set_updated_at();

drop trigger if exists set_cardio_records_updated_at on public.cardio_records;
create trigger set_cardio_records_updated_at
before update on public.cardio_records
for each row execute function public.set_updated_at();

drop trigger if exists set_foods_updated_at on public.foods;
create trigger set_foods_updated_at
before update on public.foods
for each row execute function public.set_updated_at();

drop trigger if exists set_meal_records_updated_at on public.meal_records;
create trigger set_meal_records_updated_at
before update on public.meal_records
for each row execute function public.set_updated_at();

drop trigger if exists set_meal_items_updated_at on public.meal_items;
create trigger set_meal_items_updated_at
before update on public.meal_items
for each row execute function public.set_updated_at();

create index if not exists idx_user_preferences_user_id
  on public.user_preferences(user_id);

create index if not exists idx_strength_exercises_user_name
  on public.strength_exercises(user_id, name);

create index if not exists idx_strength_exercises_user_active
  on public.strength_exercises(user_id, is_active);

create index if not exists idx_strength_workout_sessions_user_date
  on public.strength_workout_sessions(user_id, workout_date desc);

create index if not exists idx_strength_workout_exercises_user_session_sort
  on public.strength_workout_exercises(user_id, session_id, sort_order);

create index if not exists idx_strength_workout_exercises_user_exercise
  on public.strength_workout_exercises(user_id, exercise_id);

create index if not exists idx_strength_workout_sets_user_exercise_set
  on public.strength_workout_sets(user_id, workout_exercise_id, set_number);

create index if not exists idx_cardio_records_user_date
  on public.cardio_records(user_id, cardio_date desc);

create index if not exists idx_foods_user_name
  on public.foods(user_id, name);

create index if not exists idx_foods_user_active
  on public.foods(user_id, is_active);

create index if not exists idx_meal_records_user_date_type
  on public.meal_records(user_id, meal_date desc, meal_type);

create index if not exists idx_meal_items_user_meal_record
  on public.meal_items(user_id, meal_record_id);

create index if not exists idx_meal_items_user_food
  on public.meal_items(user_id, food_id);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.strength_exercises enable row level security;
alter table public.strength_workout_sessions enable row level security;
alter table public.strength_workout_exercises enable row level security;
alter table public.strength_workout_sets enable row level security;
alter table public.cardio_records enable row level security;
alter table public.foods enable row level security;
alter table public.meal_records enable row level security;
alter table public.meal_items enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
using (id = auth.uid());

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own
on public.user_preferences
for select
using (user_id = auth.uid());

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own
on public.user_preferences
for insert
with check (user_id = auth.uid());

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own
on public.user_preferences
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_preferences_delete_own on public.user_preferences;
create policy user_preferences_delete_own
on public.user_preferences
for delete
using (user_id = auth.uid());

drop policy if exists strength_exercises_select_own on public.strength_exercises;
create policy strength_exercises_select_own
on public.strength_exercises
for select
using (user_id = auth.uid());

drop policy if exists strength_exercises_insert_own on public.strength_exercises;
create policy strength_exercises_insert_own
on public.strength_exercises
for insert
with check (user_id = auth.uid());

drop policy if exists strength_exercises_update_own on public.strength_exercises;
create policy strength_exercises_update_own
on public.strength_exercises
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists strength_exercises_delete_own on public.strength_exercises;
create policy strength_exercises_delete_own
on public.strength_exercises
for delete
using (user_id = auth.uid());

drop policy if exists strength_workout_sessions_select_own on public.strength_workout_sessions;
create policy strength_workout_sessions_select_own
on public.strength_workout_sessions
for select
using (user_id = auth.uid());

drop policy if exists strength_workout_sessions_insert_own on public.strength_workout_sessions;
create policy strength_workout_sessions_insert_own
on public.strength_workout_sessions
for insert
with check (user_id = auth.uid());

drop policy if exists strength_workout_sessions_update_own on public.strength_workout_sessions;
create policy strength_workout_sessions_update_own
on public.strength_workout_sessions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists strength_workout_sessions_delete_own on public.strength_workout_sessions;
create policy strength_workout_sessions_delete_own
on public.strength_workout_sessions
for delete
using (user_id = auth.uid());

drop policy if exists strength_workout_exercises_select_own on public.strength_workout_exercises;
create policy strength_workout_exercises_select_own
on public.strength_workout_exercises
for select
using (user_id = auth.uid());

drop policy if exists strength_workout_exercises_insert_own on public.strength_workout_exercises;
create policy strength_workout_exercises_insert_own
on public.strength_workout_exercises
for insert
with check (user_id = auth.uid());

drop policy if exists strength_workout_exercises_update_own on public.strength_workout_exercises;
create policy strength_workout_exercises_update_own
on public.strength_workout_exercises
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists strength_workout_exercises_delete_own on public.strength_workout_exercises;
create policy strength_workout_exercises_delete_own
on public.strength_workout_exercises
for delete
using (user_id = auth.uid());

drop policy if exists strength_workout_sets_select_own on public.strength_workout_sets;
create policy strength_workout_sets_select_own
on public.strength_workout_sets
for select
using (user_id = auth.uid());

drop policy if exists strength_workout_sets_insert_own on public.strength_workout_sets;
create policy strength_workout_sets_insert_own
on public.strength_workout_sets
for insert
with check (user_id = auth.uid());

drop policy if exists strength_workout_sets_update_own on public.strength_workout_sets;
create policy strength_workout_sets_update_own
on public.strength_workout_sets
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists strength_workout_sets_delete_own on public.strength_workout_sets;
create policy strength_workout_sets_delete_own
on public.strength_workout_sets
for delete
using (user_id = auth.uid());

drop policy if exists cardio_records_select_own on public.cardio_records;
create policy cardio_records_select_own
on public.cardio_records
for select
using (user_id = auth.uid());

drop policy if exists cardio_records_insert_own on public.cardio_records;
create policy cardio_records_insert_own
on public.cardio_records
for insert
with check (user_id = auth.uid());

drop policy if exists cardio_records_update_own on public.cardio_records;
create policy cardio_records_update_own
on public.cardio_records
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists cardio_records_delete_own on public.cardio_records;
create policy cardio_records_delete_own
on public.cardio_records
for delete
using (user_id = auth.uid());

drop policy if exists foods_select_own on public.foods;
create policy foods_select_own
on public.foods
for select
using (user_id = auth.uid());

drop policy if exists foods_insert_own on public.foods;
create policy foods_insert_own
on public.foods
for insert
with check (user_id = auth.uid());

drop policy if exists foods_update_own on public.foods;
create policy foods_update_own
on public.foods
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists foods_delete_own on public.foods;
create policy foods_delete_own
on public.foods
for delete
using (user_id = auth.uid());

drop policy if exists meal_records_select_own on public.meal_records;
create policy meal_records_select_own
on public.meal_records
for select
using (user_id = auth.uid());

drop policy if exists meal_records_insert_own on public.meal_records;
create policy meal_records_insert_own
on public.meal_records
for insert
with check (user_id = auth.uid());

drop policy if exists meal_records_update_own on public.meal_records;
create policy meal_records_update_own
on public.meal_records
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists meal_records_delete_own on public.meal_records;
create policy meal_records_delete_own
on public.meal_records
for delete
using (user_id = auth.uid());

drop policy if exists meal_items_select_own on public.meal_items;
create policy meal_items_select_own
on public.meal_items
for select
using (user_id = auth.uid());

drop policy if exists meal_items_insert_own on public.meal_items;
create policy meal_items_insert_own
on public.meal_items
for insert
with check (user_id = auth.uid());

drop policy if exists meal_items_update_own on public.meal_items;
create policy meal_items_update_own
on public.meal_items
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists meal_items_delete_own on public.meal_items;
create policy meal_items_delete_own
on public.meal_items
for delete
using (user_id = auth.uid());
