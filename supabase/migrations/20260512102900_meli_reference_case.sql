create table if not exists nx.reference_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null unique,
  ticker text not null,
  case_type text not null,
  behavior text not null,
  lesson text not null,
  expected_system_behavior text not null,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into nx.reference_cases (
  case_key,
  ticker,
  case_type,
  behavior,
  lesson,
  expected_system_behavior,
  notes
) values (
  'MELI_FLASH_DROP_2026_05_11',
  'MELI',
  'FLASH_DROP',
  'Quality asset under temporary panic; brutal drop should trigger disciplined reaction, not prediction.',
  'Do not full buy immediately. Prepare ladder buying with Z1/Z2/Z3 sizing before any execution.',
  'Detect FLASH_DROP, classify deterministic priority, expose opportunity, generate ladder plan, suggest WATCH or PREPARE posture, and keep broker execution/manual buy decision outside automation.',
  '{
    "product_philosophy": "Reaction Quality System, not prediction system",
    "ladder_buying": true,
    "no_full_buy_immediately": true,
    "quality_asset_under_temporary_panic": true,
    "allowed_actions": ["WATCH", "PREPARE_LADDER", "WAIT"],
    "forbidden_actions": ["AUTO_BUY", "BROKER_EXECUTION", "FINAL_BUY_DECISION", "LEARNING_AUTOMATION"]
  }'::jsonb
) on conflict (case_key) do update set
  ticker = excluded.ticker,
  case_type = excluded.case_type,
  behavior = excluded.behavior,
  lesson = excluded.lesson,
  expected_system_behavior = excluded.expected_system_behavior,
  notes = excluded.notes;
