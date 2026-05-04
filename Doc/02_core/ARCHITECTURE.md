# NEXIAL — ARCHITECTURE MASTER

Last update: 2026-05-01

---

# 1. Principe global

Nexial est un système en couches :

DATA → EVENT ENGINE → DECISION ENGINE → EXECUTION ENGINE → ALERT / UI → FEEDBACK

Objectif :

> Transformer un portefeuille réel + une watchlist optimisée en décisions simples, exécutables et disciplinées.

Principe fondamental :

> Chaque € doit être alloué à la meilleure opportunité disponible, au bon moment, avec contrôle strict du risque d’exécution.

---

# 2. Mental model utilisateur

MON CAPITAL  
→ où est-il ?  
→ où pourrait-il aller ?  
→ dois-je agir ?  
→ j’exécute  
→ je mesure

---

# 3. Pipeline produit

Portfolio → Watchlist → Decision → Actions → Feedback

Lecture fonctionnelle :

1. Portfolio : capital réel existant
2. Watchlist : opportunités potentielles
3. Decision : arbitrage final
4. Actions : exécution concrète
5. Feedback : mesure de performance et amélioration

---

# 4. Data Layer

Sources principales :

- `vw_portfolio_positions_ui_v2`
- `vw_latest_real_prices_clean_v1`
- `vw_patrimoine_total_general_eur_v1`
- `vw_invest_ui_v1`
- `vw_watchlist_event_engine_v2`
- `vw_watchlist_actionable_events_v2`

Règle critique prix :

- si actif en portefeuille → utiliser prix portefeuille
- sinon → utiliser prix marché
- si prix non fiable → bloquer achat / passer en surveillance
- aucune décision exécutable sans prix fiable

---

# 5. Decision Layer

Sources décision :

- `vw_invest_now_output_v4`
- `vw_invest_ui_v1`

Règle :

- les pages utilisateur ne lisent pas directement les vues brutes
- elles lisent uniquement des vues UI stabilisées
- la logique critique reste côté SQL / backend
- l’UI ne doit pas recréer une décision contradictoire

Décisions possibles :

- BUY
- WAIT
- WATCH
- HOLD
- REINFORCE
- REDUCE
- BLOCKED

---

# 6. Execution Safety Layer

Objectif :

Empêcher une mauvaise exécution.

Contrôles obligatoires :

- prix fiable
- zone d’achat valide
- quantité exécutable
- montant cohérent
- devise correcte
- cash disponible
- ordre non obsolète
- pas de doublon ticker
- pas d’exécution sur signal faible

Règle :

> Une idée non exécutable ne doit jamais apparaître comme une action.

---

# 7. Order Monitoring Layer

Objectif :

Suivre les ordres actifs et éviter les erreurs de marché.

Fonctions :

- suivi ordres actifs
- prix limite
- écart prix actuel / prix limite
- statut ordre
- alerte si ordre obsolète
- annulation / modification proposée si changement brutal

Cas critique :

- gap overnight
- premarket violent
- news majeure
- ordre devenu trop haut / trop bas
- ordre à annuler avant ouverture

---

# 8. Premarket Protection Layer

Objectif :

Protéger l’utilisateur avant exécution.

Fonctions :

- analyse overnight
- analyse premarket
- détection gap important
- recommandation :
  - conserver ordre
  - modifier ordre
  - annuler ordre
  - attendre

Règle :

> Aucune exécution automatique sans validation utilisateur.

---

# 9. Universe Scan Layer

Objectif :

Détecter une opportunité supérieure hors watchlist.

Univers cible :

- 100 à 150 actifs mondiaux
- actions qualité
- ETF
- tech / IA / semi
- leaders structurels
- actifs PEA / CTO

Fonctions :

- score relatif
- drawdown
- momentum
- valorisation
- qualité
- comparaison coût d’opportunité

Règle :

> Un actif peut entrer en watchlist uniquement s’il devient supérieur aux actifs déjà suivis.

---

# 10. Broker Routing Layer

Objectif :

Router la meilleure décision vers la bonne enveloppe.

Critères :

- PEA
- CTO
- broker
- devise
- fiscalité
- frais
- cash disponible
- taille d’ordre
- exposition existante

Règle :

> La meilleure opportunité brute n’est pas forcément la meilleure opportunité nette.

---

# 11. UI / Product Architecture

Architecture finale validée :

1. Dashboard / Decision
2. Portfolio
3. Watchlist
4. Actions
5. Patrimoine
6. Dev

---

## 11.1 Dashboard / Decision

Rôle :

Répondre à :

> Que dois-je faire maintenant ?

Contenu :

- décision globale : ATTENDRE / INVESTIR
- cash disponible
- données à jour
- accès Actions si ordre validé

Interdit :

- top idées non actionnables
- détails techniques visibles
- patrimoine complet
- watchlist détaillée
- analyse macro

---

## 11.2 Portfolio

Rôle :

Visualiser le capital réel.

Contenu :

- positions PEA / CTO
- PRU
- cours actuel
- performance %
- poids portefeuille
- exposition
- signal Nexial :
  - HOLD
  - RENFORCER
  - ALLÉGER
  - SURVEILLER

Règle :

> Portfolio = base de décision quotidienne.

---

## 11.3 Watchlist

Rôle :

Détecter les opportunités externes.

Contenu :

- actifs cibles
- zones d’achat
- distance au prix
- ranking opportunités
- statut :
  - trop cher
  - proche zone
  - en zone
  - opportunité rare

Règle :

> Watchlist = cerveau d’opportunité.

---

## 11.4 Actions

Rôle :

Exécution uniquement.

Contenu :

- ordres concrets
- quantité
- prix
- zone validée
- compte / broker
- devise

Interdit :

- WATCH
- WAIT
- idée non actionnable
- signal incomplet

Règle :

> Si rien n’est exécutable, la page affiche RIEN À FAIRE.

---

## 11.5 Patrimoine

Rôle :

Vision long terme.

Contenu :

- patrimoine total
- répartition par compte
- répartition par devise
- cash consolidé
- FX
- allocation globale

Fréquence :

- hebdomadaire / mensuelle

Règle :

> Patrimoine ne doit pas polluer la décision quotidienne.

---

## 11.6 Dev

Rôle :

Contrôle moteur.

Contenu :

- logs
- data quality
- vues SQL
- alertes internes
- debug
- intégrité système

Règle :

> Dev est accessible uniquement pour le développeur.

---

# 12. Navigation cible

Navigation utilisateur :

Dashboard | Portfolio | Watchlist | Actions | Patrimoine

Dev :

- accessible via `/dev`
- non prioritaire pour utilisateur final

---

# 13. UX Layer

Principe :

> One decision at a time.

Règles UX :

- 1 page = 1 objectif
- 1 information = 1 endroit
- pas de scroll horizontal
- pas de double navigation
- pas de sidebar legacy
- AppNav unique
- design premium sombre
- glow subtil
- cards légères
- données techniques masquées
- complexité progressive

Niveaux utilisateur :

1. Débutant :
   - décision simple
   - action claire
   - aucun jargon

2. Intermédiaire :
   - zones
   - scores
   - ranking

3. Avancé :
   - détails moteur
   - logs
   - audit
   - dev tools

---

# 14. Integrity Layer

Fichier de référence :

- `Doc/02_core/INTEGRITY_RULES.md`

Objectifs :

- empêcher les duplications
- éviter anciennes vues
- garantir cohérence prix / portefeuille / décision
- empêcher logique critique côté UI
- éviter divergences entre Dashboard / Portfolio / Watchlist / Actions

Règles :

- aucune vue obsolète
- aucune décision dupliquée
- aucune action sans contrôle data
- aucun affichage utilisateur de debug SQL

---

# 15. Feedback Layer

Objectif :

Mesurer la qualité des décisions Nexial.

À suivre :

- ordre proposé
- ordre exécuté
- prix d’entrée
- performance après exécution
- comparaison benchmark
- économie réalisée vs DCA immédiat
- coût d’opportunité évité
- décision WAIT justifiée ou non

Règle :

> Nexial doit apprendre de ses décisions.

---

# 16. Restart Layer

Fichiers :

- `Doc/01_state/CURRENT_STATE.md`
- `Doc/01_state/NEXT_ACTION.md`
- `Doc/01_state/RESTART_PROMPT.md`

Objectif :

- reprise sans perte
- une seule prochaine tâche
- aucun drift
- aucun retour en arrière
- continuité produit

---

# 17. Règles critiques

1. Ne jamais afficher une idée non actionnable dans Actions.
2. Ne jamais afficher les détails techniques sur Dashboard.
3. Ne jamais mélanger Portfolio et Patrimoine.
4. Ne jamais mélanger Watchlist et Actions.
5. Ne jamais acheter hors zone.
6. Ne jamais exécuter sans prix fiable.
7. Ne jamais créer deux navigations.
8. Ne jamais dupliquer la logique décisionnelle côté UI.
9. Ne jamais perdre la distinction :
   - Portfolio = capital réel
   - Watchlist = opportunités
   - Decision = synthèse
   - Actions = exécution
   - Patrimoine = vision globale
   - Dev = contrôle

---

# 18. Objectif architecture

- une source de vérité par domaine
- aucune logique critique dupliquée
- décisions cohérentes
- UX premium
- exécution protégée
- reprise fiable
- scalabilité produit
- amélioration continue

---

# 19. Statut

Architecture validée.

Priorité actuelle :

1. AppNav premium
2. Dashboard clean
3. Portfolio master
4. Watchlist master
5. Patrimoine premium
6. Dev center