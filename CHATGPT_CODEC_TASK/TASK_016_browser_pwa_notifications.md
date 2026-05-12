# TASK 016 - Notifications PWA browser

Execute depuis les fichiers sources `TASK 016 - Notifications PWA browse.txt` et `TASK 016 - PWA notifications (brows.txt`.

## Resultat

- Service worker ajoute dans `public/sw.js`.
- Manifest PWA ajoute dans `public/manifest.json`.
- Icone et badge PWA ajoutes.
- Runtime client global pour:
  - enregistrer le service worker;
  - ecouter `nx.investment_alerts` via Supabase Realtime;
  - afficher une notification locale pour les alertes `HIGH` ou `CRITICAL`;
  - ouvrir `/aujourdhui?alert=<id>` au clic sur notification;
  - utiliser la Badge API quand disponible.
- Panneau settings ajoute dans `/preferences`:
  - bouton `Activer les notifications`;
  - bouton `Tester notification`;
  - message si permission refusee ou navigateur non supporte.

## Hors scope respecte

Les notifications push quand l'app est fermee ne sont pas implementees: pas de VAPID ni d'API backend push dans cette task.
