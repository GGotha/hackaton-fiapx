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

-- better-auth identity tables (email/password + jwt plugin). Generated with
-- @better-auth/cli from apps/auth/auth.config.ts; kept here so this stays the
-- single database creation script.
create table if not exists "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table if not exists "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table if not exists "jwks" (
  "id" text not null primary key,
  "publicKey" text not null,
  "privateKey" text not null,
  "createdAt" timestamptz not null,
  "expiresAt" timestamptz
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");
