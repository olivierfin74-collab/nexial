# NEXIAL — INTEGRITY RULES

## Objectif

Garantir la cohérence globale du projet Nexial :
- données
- vues SQL
- UI
- décisions
- sauvegardes
- reprises de session

---

## Règle 1 — Une source de vérité par domaine

### Portefeuille
Source officielle :
- vw_portfolio_positions_ui_v2

### Invest / Actions
Source officielle :
- vw_invest_ui_v1

### Patrimoine
Source officielle :
- vw_patrimoine_total_general_eur_v1

### Prix marché
Fallback uniquement :
- vw_latest_real_prices_clean_v1

---

## Règle 2 — Interdiction des fallbacks UI non maîtrisés

Une page UI ne doit pas parcourir plusieurs vues candidates.

Interdit :
- VIEW_CANDIDATES
- fallback automatique vers anciennes vues
- utilisation directe d’anciennes vues de test

Chaque page doit avoir une source unique explicite.

---

## Règle 3 — Prix

Si actif en portefeuille :
- utiliser le prix portefeuille / broker

Sinon :
- utiliser prix marché nettoyé

Si prix non fiable :
- bloquer l’action
- statut SURVEILLANCE
- aucune recommandation BUY

---

## Règle 4 — Drop de vue

Avant tout DROP VIEW :
1. contrôler les dépendances
2. confirmer qu’aucune vue critique ne dépend d’elle
3. archiver l’ancien SQL si nécessaire

---

## Règle 5 — UI

Chaque page doit respecter :
- 1 rôle unique
- 1 source de données principale
- pas de duplication de logique métier
- pas de calcul critique uniquement côté front

---

## Règle 6 — Sauvegarde

Fin de session obligatoire :
1. update CURRENT_STATE.md
2. update NEXIAL_STATE.md
3. update NEXT_ACTION.md
4. append CHANGELOG.md
5. archive snapshot si changement majeur

---

## Règle 7 — Reprise

Au nouveau chat :
1. lire CURRENT_STATE.md
2. lire NEXT_ACTION.md
3. vérifier NEXIAL_MASTER.md si besoin
4. reprendre uniquement la tâche verrouillée

Phrase de reprise :
"on reprend Nexial"