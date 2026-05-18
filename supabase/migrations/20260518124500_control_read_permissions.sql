-- Read-only permissions for the /control server-rendered dashboard.
-- /control is protected by middleware, so the runtime PostgREST role is
-- authenticated. No mutation privilege is granted here.

grant usage on schema nx to authenticated;

grant select on table
  nx.vw_control_center_summary,
  nx.vw_engine_health_calibrated_v1,
  nx.vw_data_freshness_alerts,
  nx.vw_market_freshness,
  nx.vw_divergence_tracking_kpis,
  nx.vw_alert_quality_kpis,
  nx.cron_run_log,
  nx.architecture_decisions
to authenticated;
