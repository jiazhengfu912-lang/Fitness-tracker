-- 002_add_body_metrics.sql
-- Add body metrics table for weight, body fat, waist and notes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  weight_kg numeric not null,
  body_fat_percent numeric,
  waist_cm numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint body_metrics_weight_positive check (weight_kg > 0),
  constraint body_metrics_body_fat_range check (
    body_fat_percent is null or (body_fat_percent >= 0 and body_fat_percent <= 100)
  ),
  constraint body_metrics_waist_positive check (
    waist_cm is null or waist_cm > 0
  ),
  constraint body_metrics_user_date_unique unique (user_id, metric_date)
);

create index if not exists body_metrics_user_id_idx
  on public.body_metrics(user_id);

create index if not exists body_metrics_metric_date_idx
  on public.body_metrics(metric_date);

create index if not exists body_metrics_user_id_metric_date_idx
  on public.body_metrics(user_id, metric_date);

drop trigger if exists set_body_metrics_updated_at on public.body_metrics;

create trigger set_body_metrics_updated_at
before update on public.body_metrics
for each row
execute function public.set_updated_at();

alter table public.body_metrics enable row level security;

drop policy if exists "body_metrics_select_own" on public.body_metrics;
create policy "body_metrics_select_own"
on public.body_metrics
for select
using (user_id = auth.uid());

drop policy if exists "body_metrics_insert_own" on public.body_metrics;
create policy "body_metrics_insert_own"
on public.body_metrics
for insert
with check (user_id = auth.uid());

drop policy if exists "body_metrics_update_own" on public.body_metrics;
create policy "body_metrics_update_own"
on public.body_metrics
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "body_metrics_delete_own" on public.body_metrics;
create policy "body_metrics_delete_own"
on public.body_metrics
for delete
using (user_id = auth.uid());
