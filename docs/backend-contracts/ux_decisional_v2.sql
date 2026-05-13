-- ═══════════════════════════════════════════════════════════════════
-- Nexial — UX décisionnelle V2 — DOCUMENTATION ONLY
-- Date : 2026-05-13
-- Backend source : Supabase project kttdmeyrhndufymgoxqk
--
-- ⚠️  CE FICHIER N'EST PAS UNE MIGRATION EXÉCUTABLE.
--
-- Il documente le DDL et les signatures RPC qui vivent EN PROD sur Supabase.
-- Il est placé volontairement DANS docs/backend-contracts/ et NON DANS
-- supabase/migrations/ pour éviter une exécution accidentelle par
-- `supabase migration up`.
--
-- Pour exécuter quoi que ce soit, passer par un opérateur backend
-- (autorisation explicite requise, hors périmètre SAFE_AUTONOMOUS).
-- ═══════════════════════════════════════════════════════════════════

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 1. TABLES PERSISTANTES                                          │
-- └────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS nx.user_position_thesis (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  conviction_level text NOT NULL CHECK (conviction_level IN (
    'CORE_HOLD', 'STRONG_BUY', 'BUY_DIPS', 'NEUTRAL',
    'TRIM_ON_RALLY', 'EXIT_ON_RALLY', 'EXIT_NOW'
  )),
  thesis_md text,
  exit_target_price numeric,
  exit_target_pnl_pct numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

CREATE TABLE IF NOT EXISTS nx.user_position_thesis_history (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  conviction_level text NOT NULL,
  thesis_md text,
  exit_target_price numeric,
  exit_target_pnl_pct numeric,
  change_kind text NOT NULL CHECK (change_kind IN ('CREATED','UPDATED','DELETED')),
  previous_conviction_level text,
  changed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nx.alert_kind_labels (
  alert_kind text PRIMARY KEY,
  label_fr text NOT NULL,
  technical_term text NOT NULL,
  description_fr text,
  emoji text,
  alert_tier text NOT NULL CHECK (alert_tier IN (
    'CRITIQUE', 'ACTION', 'SURVEILLANCE', 'INFORMATION'
  )),
  display_priority int DEFAULT 50
);

CREATE TABLE IF NOT EXISTS nx.action_verdict_labels (
  action_code text PRIMARY KEY,
  label_fr text NOT NULL,
  emoji text,
  color text,
  cta_button_fr text,
  display_priority int DEFAULT 50
);

CREATE TABLE IF NOT EXISTS nx.wording_dictionary (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  context text NOT NULL,
  old_term text NOT NULL,
  new_term text NOT NULL,
  rationale text,
  is_canonical boolean DEFAULT true,
  applies_to text[] DEFAULT '{ui,messages,emails}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(context, old_term)
);

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 2. RPCs CRITIQUES (signatures uniquement)                       │
-- │    Le code complet est en prod sur Supabase                     │
-- └────────────────────────────────────────────────────────────────┘

-- A3 - Pivot décisionnelle (legacy shape, level_1/2/3)
-- CREATE OR REPLACE FUNCTION nx.fn_alert_decision_message(p_alert_id uuid)
--   RETURNS jsonb LANGUAGE plpgsql STABLE AS $$ ... $$;

-- A3 - Pivot décisionnelle (Codex shape, verdict/explanation/position/thesis/...)
-- CREATE OR REPLACE FUNCTION nx.fn_alert_decision_v2(p_alert_id uuid)
--   RETURNS jsonb LANGUAGE plpgsql STABLE AS $$ ... $$;

-- A4 - Feed décisionnel (Codex shape)
-- CREATE OR REPLACE FUNCTION nx.fn_alerts_decisional_feed_v2(
--   p_user_id uuid DEFAULT ...,
--   p_limit int DEFAULT 50,
--   p_experience_mode text DEFAULT 'STANDARD',
--   p_only_active boolean DEFAULT true,
--   p_dedup_by_ticker boolean DEFAULT true
-- ) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$ ... $$;

-- Centre décisionnel global
-- CREATE OR REPLACE FUNCTION nx.fn_inbox_decisional(
--   p_user_id uuid DEFAULT ...,
--   p_experience_mode text DEFAULT 'STANDARD',
--   p_limit int DEFAULT 30
-- ) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$ ... $$;

-- Workflow thèse
-- CREATE OR REPLACE FUNCTION nx.fn_set_position_thesis(...)
--   RETURNS jsonb LANGUAGE plpgsql AS $$ ... $$;
-- CREATE OR REPLACE FUNCTION nx.fn_review_thesis_for_position(...)
--   RETURNS jsonb LANGUAGE sql STABLE AS $$ ... $$;
-- CREATE OR REPLACE FUNCTION nx.fn_positions_without_thesis(...)
--   RETURNS jsonb LANGUAGE sql STABLE AS $$ ... $$;

-- Capabilities + wording
-- CREATE OR REPLACE FUNCTION nx.fn_user_ui_capabilities(...)
--   RETURNS jsonb LANGUAGE sql STABLE AS $$ ... $$;
-- CREATE OR REPLACE FUNCTION nx.fn_get_wording_dictionary(p_context text DEFAULT NULL)
--   RETURNS jsonb LANGUAGE sql STABLE AS $$ ... $$;

-- Telegram
-- CREATE OR REPLACE FUNCTION nx.fn_telegram_decisional_message(
--   p_alert_id uuid, p_base_url text DEFAULT 'https://nexial.app'
-- ) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$ ... $$;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 3. GRANTS                                                       │
-- └────────────────────────────────────────────────────────────────┘

GRANT EXECUTE ON FUNCTION nx.fn_alert_decision_message(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_alert_decision_v2(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_alerts_decisional_feed_v2(uuid, integer, text, boolean, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_inbox_decisional(uuid, text, integer) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_review_thesis_for_position(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_positions_without_thesis(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_set_position_thesis(uuid, uuid, text, text, numeric, numeric) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_user_ui_capabilities(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_telegram_decisional_message(uuid, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION nx.fn_get_wording_dictionary(text) TO authenticated, anon, service_role;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 4. CONNEXION FRONTEND                                           │
-- └────────────────────────────────────────────────────────────────┘
--
-- Pour brancher le frontend :
-- 1. Utiliser createClient() de @supabase/ssr ou supabase-js
-- 2. Appeler les RPCs via supabase.rpc('fn_xxx', {...})
-- 3. Typer le retour avec les interfaces de @/types/decision.ts
--
-- Exemple :
--   const { data } = await supabase.rpc('fn_inbox_decisional', {
--     p_experience_mode: 'STANDARD',
--     p_limit: 30
--   });
--   const inbox = data as InboxPayload;
