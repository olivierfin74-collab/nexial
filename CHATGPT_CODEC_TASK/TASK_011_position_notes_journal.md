# TASK 011 - Notes journal personnel par position

Execute depuis le fichier source `TASK 011 - Notesjournal personnel p.txt`.

## Resultat

- Ajout d'une section `Mes notes` sur la page detail asset mobile.
- Ajout du panneau equivalent sur la page detail asset desktop.
- Support des types `thesis`, `observation`, `todo`, `event`.
- Creation, edition inline et suppression avec confirmation.
- Appels RPC prevus:
  - `fn_list_asset_notes(p_asset_id)`
  - `fn_add_asset_note(p_asset_id, p_note_text, p_note_kind)`
  - `fn_update_asset_note(p_note_id, p_note_text)`
  - `fn_delete_asset_note(p_note_id)`

## Note d'integration

Quand l'API detail asset ne fournit pas encore `asset_id`, l'interface reste utilisable en mode temporaire local et affiche l'information dans la section notes.
