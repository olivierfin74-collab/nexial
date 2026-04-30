# PATCH v5.2 — Autonomous Monitoring & Decision Engine

## PURPOSE

Ce patch complète **NEXIAL — MASTER SNAPSHOT v5.1 (INDUSTRIAL CONTROL SYSTEM — FINAL)**.

Objectif :
faire évoluer Nexial d’un système d’analyse vers un **système autonome de surveillance, décision et proposition d’actions**, capable de remplacer le suivi manuel du marché.

Ce patch est considéré comme **structurant et validé**.

---

# 1. PRODUCT SHIFT

## Ancien paradigme

Nexial aide à analyser.

## Nouveau paradigme

Nexial surveille, filtre, décide et ne restitue que les actions utiles.

### Finalité

L’utilisateur ne suit plus le marché.
Nexial suit pour lui :

* le portefeuille
* la watchlist
* les ordres actifs
* le régime de marché

Puis Nexial restitue :

* 0 à 3 actions maximum
* claires
* priorisées
* immédiatement exécutables

---

# 2. PRIMARY USER NEED

Le besoin produit prioritaire validé est le suivant :

Construire un moteur permettant à l’utilisateur de :

* déléguer le suivi du marché
* recevoir un plan d’action selon un rythme choisi
* éviter le bruit
* réduire le temps de décision
* ne plus avoir à corriger ou affiner manuellement la proposition

Cas d’usage cible :

* beta test réel durant le mois de mai
* utilisation concrète à partir du 1er juin en condition de travail normale
* suivi PEA + CTO + watchlists

---

# 3. CORE PRODUCT RULES

Règles absolues du moteur :

* 1 réponse = exécutable immédiatement
* 0 interprétation utilisateur
* 0 raffinement nécessaire
* 0 proposition moyenne
* max 3 actions
* pas d’achat sans edge réel
* pas d’achat sur breakout
* si doute → NO ACTION
* si plusieurs options se valent → NO ACTION
* si l’edge n’est pas supérieur au cash → NO ACTION

Principe fondamental :

**Pas d’edge clair = pas d’action**

---

# 4. MONITORING ENGINE

## Mission

Surveiller en continu :

* positions détenues
* watchlist d’opportunités
* ordres actifs
* marché global
* régime de marché
* scores d’actifs
* priorités d’action

## Univers surveillé

### Portefeuille

* PEA
* CTO
* autres poches définies

### Watchlists

* watchlist PEA
* watchlist CTO
* actifs objectifs

### Ordres

* ordres simples
* packs d’ordres
* ordres devenus obsolètes

---

## Statut par actif

Chaque actif doit recevoir un statut unique :

* OK
* WATCH
* ACTION
* URGENT

Chaque actif doit aussi recevoir une priorité :

* P0 = aucune action
* P1 = surveillance
* P2 = action recommandée
* P3 = action urgente / ordre à revoir

---

# 5. RHYTHM ENGINE

Le moteur doit permettre un rythme configurable selon le profil utilisateur.

## DAILY

Utilisé pour :

* utilisateurs actifs
* CTO
* décisions plus fréquentes

Sortie :

* synthèse courte
* opportunités max 3
* risques max 3
* actions max 3

## WEEKLY

Utilisé pour :

* utilisateurs occupés
* PEA long terme
* suivi consolidé

Sortie :

* changements significatifs uniquement
* arbitrages potentiels
* nouveaux entrants watchlist
* revue portefeuille

## EVENT-DRIVEN

Utilisé pour :

* utilisateurs passifs
* profils long terme
* mode alerte seulement

Sortie :

* aucune routine obligatoire
* déclenchement uniquement sur événement significatif

Le rythme pilote :

* fréquence de scan
* fréquence de synthèse
* niveau de détail
* seuil de restitution

---

# 6. DECISION ENGINE HARDENING

## Problème identifié

Le fonctionnement actuel expose le système à :

* ajustements successifs
* raffinement après feedback
* temps perdu avant exécution
* perte de confiance

## Objectif

Le moteur doit produire une proposition :

* unique
* juste
* contrainte
* directement exécutable

### Règle produit

**First shot = correct**

---

# 7. DECISION STACK

Le moteur décisionnel doit fonctionner dans l’ordre suivant :

## 7.1 Market Regime Engine

Mission :
qualifier le contexte global avant toute décision.

Analyse :

* tendance globale
* volatilité
* contexte macro
* breadth
* stress marché
* FX structurants si besoin

Sortie :

* BULL
* NEUTRAL
* WEAK
* STRESS

Impact :

* définit l’agressivité autorisée
* ajuste le niveau de sélectivité
* influence le déploiement du cash

---

## 7.2 Opportunity Engine

Mission :
générer une shortlist de candidats.

Score :

* qualité
* croissance
* momentum
* valorisation

Sortie :

* top candidats seulement
* rejet massif des actifs faibles

---

## 7.3 Opportunity Cost Engine

Mission :
vérifier si l’actif mérite réellement du capital maintenant.

Question obligatoire :

**“Est-ce le meilleur usage de ce capital maintenant ?”**

Comparaison :

* autres opportunités disponibles
* portefeuille actuel
* ligne existante
* cash

Si la réponse est NON :

* rejet immédiat

Cette couche est obligatoire avant toute proposition d’achat.

---

## 7.4 Timing Engine

Mission :
vérifier que le moment d’entrée est valide.

Doit distinguer :

* vrai pullback
* faux pullback
* breakout interdit
* respiration normale
* faiblesse exploitable

Sortie :

* BUY
* WAIT
* REJECT

Aucune proposition ne doit survivre à un timing invalide.

---

## 7.5 Allocation Engine

Mission :
décider le sizing et la place du capital.

Analyse :

* cash disponible
* hiérarchie des opportunités
* taille de position
* surpondération éventuelle
* type de compte
* logique PEA vs CTO

Sortie :

* montant à investir
* nombre de lignes
* nombre d’ordres
* compte cible
* ordre simple ou pack d’ordres

---

## 7.6 CIO Final Decision Layer

Mission :
bloquer tout ce qui n’est pas excellent.

Validation finale obligatoire :

* edge réel présent ?
* meilleure opportunité disponible ?
* usage optimal du capital ?
* cohérence avec le portefeuille ?
* timing réellement valide ?
* risque acceptable ?

Sortie unique :

* BUY avec ordre précis
  OU
* NO ACTION

Règle :
si hésitation → NO ACTION

---

# 8. ENTRY PLAN ENGINE

Quand une décision BUY est validée, Nexial doit générer un plan d’entrée directement exécutable.

Contenu minimal :

* actif
* compte cible
* quantité ou montant
* prix limite
* validité
* justification courte
* priorité

Le moteur doit pouvoir générer :

* ordre simple
* entrée fractionnée
* ordre multi-niveaux
* pack d’ordres

---

# 9. ORDER PACK SYSTEM

Le système doit supporter des packs d’ordres.

Objectif :
réduire le coût cognitif et accélérer l’exécution.

Fonctions :

* plusieurs niveaux de prix
* plusieurs ordres liés
* validation unique
* statut global
* suivi de cohérence

Exemple :

* ordre principal exécutable
* ordre opportuniste plus bas
* réévaluation automatique si contexte change

---

# 10. ORDER WATCH ENGINE

Les ordres doivent être considérés comme des objets vivants.

Le moteur doit surveiller :

* le marché global
* l’évolution de l’actif
* le changement de régime
* l’obsolescence du setup
* l’apparition d’une meilleure opportunité
* la cohérence continue de l’ordre avec la thèse initiale

Actions possibles :

* KEEP
* AMEND
* CANCEL
* ALERT

Triggers de revue :

* retournement marché
* news majeure
* volatilité anormale
* spread anormal
* ordre trop ancien
* perte d’edge
* opportunité supérieure détectée

---

# 11. ALERT ENGINE

Les alertes doivent être :

* rares
* prioritaires
* actionnables

Types d’alertes à supporter :

1. ordre exécuté
2. entrée en zone
3. retournement marché / actif
4. ordre obsolète
5. ordre à revoir
6. opportunité supérieure détectée

Règle absolue :
aucune alerte informative sans action possible

---

# 12. MARKET DATA STRATEGY

Nexial ne doit pas être un système tick-by-tick.

Principe validé :
**quasi temps réel intelligent > temps réel brut**

Données à utiliser prioritairement :

* last price
* bid / ask
* volume
* high / low
* variation
* distance aux zones
* drawdown
* régime de marché

Fréquences cibles :

* ordres actifs / zones critiques : 10 à 30 sec
* positions portefeuille : ~1 min
* watchlists : 1 à 5 min

Le moteur doit surveiller :

* des événements
  et non
* chaque micro-mouvement

---

# 13. STACK TECHNIQUE VALIDÉE

## Cœur métier

* Supabase / PostgreSQL
* logique SQL-first
* scoring déterministe
* règles traçables

## Orchestration

* Temporal
* workflows durables
* scans
* réévaluations
* surveillance
* alertes

## Market data

* Polygon pour data US / CTO
* IBKR API pour portefeuille + exécution
* source simplifiée pour PEA dans le MVP

## IA / agents

* OpenAI Responses API / Agents SDK
* usage IA limité à :

  * synthèse
  * challenge
  * reformulation
  * contrôle secondaire
  * surveillance enrichie

Règle :
l’IA n’est jamais source unique de décision

---

# 14. PEA VS CTO EXECUTION LOGIC

## PEA

* logique long terme
* faible fréquence
* sélectivité élevée
* renfort sur repli uniquement
* priorité qualité / structure / composition

## CTO

* logique opportuniste
* plus dynamique
* rythme plus fréquent
* plus grande sensibilité au momentum et au timing
* arbitrage plus rapide possible

Le moteur doit traiter PEA et CTO comme deux logiques distinctes, même si la couche de surveillance est commune.

---

# 15. USER OUTPUT STANDARD

La sortie utilisateur doit être extrêmement simple.

Format cible :

## Statut

* régime marché
* niveau d’action du jour

## Opportunités

* 0 à 3 max

## Risques

* 0 à 3 max

## Actions

* 0 à 3 max
* directement exécutables

Chaque action doit inclure :

* actif
* compte
* ordre
* prix
* validité
* justification courte

---

# 16. BETA OBJECTIVE

D’ici le 1er juin, Nexial doit être capable de :

* suivre les portefeuilles et watchlists sans intervention manuelle
* produire des décisions selon un rythme choisi
* générer des ordres exploitables
* surveiller les ordres actifs
* alerter seulement quand nécessaire

Objectif test du mois de mai :
valider ce fonctionnement en usage réel quotidien.

---

# 17. INTEGRATION RULE

Ce patch est considéré comme :

* validé
* structurant
* prêt à merger

Le futur **MASTER SNAPSHOT v5.2** devra être construit comme :

* MASTER SNAPSHOT v5.1
* * ce patch v5.2
* * nettoyage des doublons
* * réorganisation cohérente
* * conservation de toute la continuité utile

Ce patch ne remplace pas le master snapshot existant.
Il constitue la base du prochain merge complet.

---
