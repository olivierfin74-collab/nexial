create table if not exists nx.market_regime_history (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz not null default now(),
  detected_date date not null default current_date,
  regime text not null check (regime in ('BULL', 'NEUTRAL', 'WEAK', 'STRESS')),
  score numeric not null check (score >= 0 and score <= 100),
  index_score numeric not null check (index_score >= 0 and index_score <= 35),
  volatility_score numeric not null check (volatility_score >= 0 and volatility_score <= 25),
  breadth_score numeric not null check (breadth_score >= 0 and breadth_score <= 20),
  macro_score numeric not null check (macro_score >= 0 and macro_score <= 20),
  source text not null default 'api',
  created_at timestamptz not null default now()
);

create index if not exists market_regime_history_detected_at_idx
  on nx.market_regime_history (detected_at desc);

create unique index if not exists market_regime_history_daily_source_uidx
  on nx.market_regime_history (detected_date, source);

create or replace view nx.vw_latest_market_regime as
select
  id,
  detected_at,
  detected_date,
  regime,
  score,
  index_score,
  volatility_score,
  breadth_score,
  macro_score,
  source,
  created_at
from nx.market_regime_history
order by detected_at desc
limit 1;
