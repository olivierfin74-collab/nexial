create schema if not exists nx;
create extension if not exists pgcrypto;

create table if not exists nx.flash_drop_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid,
  ticker text not null,
  detected_at timestamptz not null default now(),
  detection_bucket timestamptz not null,
  price numeric,
  intraday_change_pct numeric,
  close_to_close_pct numeric,
  price_vs_vwap_pct numeric,
  signal_strength text not null check (signal_strength in ('MEDIUM', 'HIGH', 'EXTREME')),
  source text not null default 'api',
  market_cap numeric,
  volume numeric,
  trigger_reason text,
  created_at timestamptz not null default now()
);

create index if not exists flash_drop_events_detected_at_idx
  on nx.flash_drop_events (detected_at desc);

create index if not exists flash_drop_events_ticker_idx
  on nx.flash_drop_events (ticker);

create unique index if not exists flash_drop_events_no_spam_idx
  on nx.flash_drop_events (ticker, source, detection_bucket);

create or replace view nx.vw_flash_drop_events_recent as
select
  id,
  asset_id,
  ticker,
  detected_at,
  price,
  intraday_change_pct,
  close_to_close_pct,
  price_vs_vwap_pct,
  signal_strength,
  source,
  trigger_reason,
  created_at
from nx.flash_drop_events
where detected_at >= now() - interval '24 hours'
order by detected_at desc;
