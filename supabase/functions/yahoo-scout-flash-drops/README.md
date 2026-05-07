# Yahoo Scout Flash Drops — Déploiement

Edge Function Phase L de Alert Engine V3. Capte les flash drops intra-day pour générer des alertes ultra-rapides type AMD -8% à 14h.

## Pipeline

1. Récupère les top losers du jour US via Yahoo Finance API non-officielle (gratuit)
2. Récupère les quotes intraday de tous les actifs Nexial actifs
3. Filtre les drops >= -3% qui matchent la watchlist Nexial
4. Insert dans nx.flash_scout_snapshots
5. Appelle nx.fn_generate_flash_alerts() pour créer les alertes FLASH_DROP
6. Return JSON avec stats + alertes nouvelles

## Déploiement (Claude Code en local)

Depuis le repo Nexial sur ta machine, commandes bash :

    # 1. Tester en local d'abord
    supabase functions serve yahoo-scout-flash-drops

    # 2. Tester via curl en local
    curl -i http://127.0.0.1:54321/functions/v1/yahoo-scout-flash-drops \
      -H "Authorization: Bearer <ton-anon-key>"

    # 3. Si OK, déployer en prod
    supabase functions deploy yahoo-scout-flash-drops --project-ref kttdmeyrhndufymgoxqk

## Schedule cron

Une fois déployée, le cron Supabase sera créé via MCP. Schedule : */30 13-20 * * 1-5 (toutes les 30 min, 13h-21h UTC, lundi-vendredi).

## Variables d'environnement requises

L'Edge Function utilise :
- SUPABASE_URL (auto-fournie par Supabase)
- SUPABASE_SERVICE_ROLE_KEY (auto-fournie par Supabase)

Pas de clé Yahoo nécessaire (API non-officielle gratuite).

## Test manuel via SQL

Pour valider le pipeline sans appeler Yahoo, on peut simuler un snapshot :

    INSERT INTO nx.flash_scout_snapshots (
      scout_source, ticker, current_price, previous_close,
      intraday_chg_pct, asset_id, in_watchlist
    )
    VALUES (
      'manual_test', 'AMD', 138.50, 150.00, -7.67,
      (SELECT id FROM nx.assets WHERE ticker='AMD'),
      true
    );

    SELECT * FROM nx.fn_generate_flash_alerts();

## Limitations

- API Yahoo non-officielle : peut casser sans préavis (mitigation : fallback EODHD intraday $20/mo)
- Rate limit non documenté (tester avec 30 min interval, monter à 15 min si OK)
- Latence ~15 min sur Yahoo data (acceptable pour swing trading)

## Backup plan

Si Yahoo bloque les requêtes :
1. Ajouter un User-Agent rotation
2. Utiliser un proxy CloudFlare Workers
3. Basculer sur EODHD /eod-bulk-last-day ou /intraday (payant mais stable)
