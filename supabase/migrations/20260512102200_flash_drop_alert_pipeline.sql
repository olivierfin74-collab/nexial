create or replace view nx.vw_flash_drop_actionable_alerts as
select
  id,
  id as flash_drop_event_id,
  ticker,
  'FLASH_DROP'::text as alert_kind,
  'NEW'::text as status,
  case signal_strength
    when 'EXTREME' then 'CRITICAL'
    when 'HIGH' then 'HIGH'
    else 'MEDIUM'
  end as severity,
  case signal_strength
    when 'EXTREME' then 90
    when 'HIGH' then 75
    else 60
  end as opportunity_score,
  detected_at as created_at,
  price,
  intraday_change_pct,
  close_to_close_pct,
  price_vs_vwap_pct,
  signal_strength,
  trigger_reason,
  '/aujourdhui?alert=' || id::text as deeplink_url,
  ticker || ' flash drop ' ||
    coalesce(intraday_change_pct::text, close_to_close_pct::text, price_vs_vwap_pct::text, '?') ||
    '% detected' as message_text
from nx.flash_drop_events
where detected_at >= now() - interval '24 hours'
order by detected_at desc;
