# GSA notes and notifications

In the GSA app, a guest writes a note on an abstract or session and finds it on **Notes**. **Notifications** shows an empty list with All and Unread tabs, as the real app does before the society sends anything.

## Sub-features

- `note-save` saves a note from an abstract page and shows "Saved".
- `note-list` lists saved notes on `/notes`, each linking back to its abstract.
- `notes-empty` explains how to add a note when there are none.
- `notifications-empty` shows "No notifications".

## How to get to it (user POV)

- The **My note** box on an abstract or session page.
- **Notes** and **Notifications** in the menu.

## Driving it with look.mts

Preconditions:

- `verify.sh launch gsa` printed `READY` and doctor passed. A new guest has no notes.

- **Empty notes.** Run `L gsa /notes empty --expect "heading=Notes"`. The `.aria.txt` contains `No notes yet.`
- **Save a note.** Run `L gsa /talks/16121 note --fill "My note=Ask about the emulators." --click "button=Save note" --expect "status=Saved"`.
- **Second view.** Run `L gsa /notes listed --expect "heading=Notes"`. The `.aria.txt` contains `Ask about the emulators.`
- **Notifications.** Run `L gsa /notifications empty --expect "heading=Notifications"`. The `.aria.txt` contains `No notifications`.

## Gotchas

- Notes are GSA only, because the real GSA app (Guidebook) has them and the AMS app does not.
- The `Saved` status shows only until the note is edited again.
