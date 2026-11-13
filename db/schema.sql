-- Idempotent: safe to run on every deploy (`npm run db:migrate`).
-- Planned addition, kept out until it is built: OAuth accounts (Continue with Google).

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text,              -- null for accounts that will only sign in with Google
  name text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,     -- sha-256 of the cookie value; the raw token is never stored
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user on sessions (user_id);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount integer not null,         -- smallest currency unit: paise or cents
  currency text not null check (currency in ('INR', 'USD')),
  status text not null default 'created' check (status in ('created', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists purchases_user on purchases (user_id);

-- MCP server (/api/mcp). One key per account; making a new one replaces the old.
create table if not exists api_keys (
  key_hash text primary key,       -- sha-256 of the key; the key itself is shown once and never stored
  user_id uuid not null unique references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Gradients created through the MCP server, per account per calendar month (UTC).
create table if not exists mcp_usage (
  user_id uuid not null references users(id) on delete cascade,
  month date not null,
  count integer not null default 0,
  primary key (user_id, month)
);
