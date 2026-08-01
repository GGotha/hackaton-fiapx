-- FIAP X — video processing schema.
-- Runs automatically on first Postgres startup (mounted into
-- /docker-entrypoint-initdb.d). Also usable standalone: psql "$DATABASE_URL" -f init.sql

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'video_status') then
    create type video_status as enum ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  end if;
end
$$;

create table if not exists videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  user_email    text not null,
  original_name text not null,
  status        video_status not null default 'PENDING',
  storage_key   text not null,
  zip_key       text,
  frame_count   integer,
  error         text,
  size_bytes    bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_videos_user_created on videos (user_id, created_at desc);
create index if not exists idx_videos_status on videos (status);

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_set_updated_at on videos;
create trigger videos_set_updated_at
  before update on videos
  for each row
  execute function set_updated_at();
