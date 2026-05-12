# TASK 006 - Boutons d'action sur alertes (Vu / Ignorer)

Source initiale: `TASK_006 - Actions sur alertes (Mar.txt`.

## Objectif

Ajouter sur chaque alerte un menu d'actions:
- `Marquer comme vu` pour passer une alerte `NEW` en `SEEN`
- `Ignorer` avec une modale de raison optionnelle pour passer l'alerte en `DISMISSED`

## Backend cible

```ts
supabase.rpc('fn_mark_alert_seen', { p_alert_id: string })

supabase.rpc('fn_dismiss_alert', {
  p_alert_id: string,
  p_reason: string,
})
```

## Criteres

- Kebab visible sur chaque card alerte.
- Menu avec `Marquer comme vu` si `NEW`, et `Ignorer`.
- `SEEN` reduit l'opacite a `0.7`.
- `DISMISSED` filtre l'alerte cote frontend.
- Erreur visible si une RPC echoue.
- `npm run build` doit passer.
