create table if not exists nx.ladder_plans (
  id uuid primary key default gen_random_uuid(),
  flash_drop_event_id uuid not null references nx.flash_drop_events(id) on delete cascade,
  asset_id uuid,
  ticker text not null,
  z1_price numeric not null,
  z2_price numeric not null,
  z3_price numeric not null,
  z1_weight numeric not null default 0.40,
  z2_weight numeric not null default 0.35,
  z3_weight numeric not null default 0.25,
  atr_used numeric,
  status text not null default 'PROPOSED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ladder_plans_weights_check check (
    z1_weight = 0.40 and z2_weight = 0.35 and z3_weight = 0.25
  )
);

create unique index if not exists ladder_plans_flash_drop_event_uidx
  on nx.ladder_plans (flash_drop_event_id);

create index if not exists ladder_plans_created_at_idx
  on nx.ladder_plans (created_at desc);

create or replace view nx.vw_ladder_plans_recent as
select
  lp.id,
  lp.flash_drop_event_id,
  lp.asset_id,
  lp.ticker,
  lp.z1_price,
  lp.z2_price,
  lp.z3_price,
  lp.z1_weight,
  lp.z2_weight,
  lp.z3_weight,
  lp.atr_used,
  lp.status,
  lp.created_at,
  fde.signal_strength,
  fde.intraday_change_pct,
  fde.close_to_close_pct,
  fde.price_vs_vwap_pct
from nx.ladder_plans lp
join nx.flash_drop_events fde on fde.id = lp.flash_drop_event_id
order by lp.created_at desc;
