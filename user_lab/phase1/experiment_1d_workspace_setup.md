# Experiment 1d Workspace Setup

## Source path

- `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`

## ASCII comparison path

- `/private/tmp/paperclip_ascii_ab/PaperclipApp`

## Method used

- Used a temporary ASCII-only copy, not a symlink.
- Copy command used `rsync` with exclusions.
- This was chosen so that both `pwd` and `realpath` remain ASCII-only at the actual execution point.

## Path verification

- `pwd` inside the comparison workspace:
  - `/private/tmp/paperclip_ascii_ab/PaperclipApp`
- `realpath` inside the comparison workspace:
  - `/private/tmp/paperclip_ascii_ab/PaperclipApp`
- Interpretation:
  - the comparison path stays ASCII-only even after realpath resolution
  - this makes it a valid control for the authenticated A/B run

## Excluded folders

- `.git`
- `node_modules`
- `.build`
- `DerivedData`
- `dist`
- `user_lab`
- `.codex`

## Notes

- The resulting ASCII comparison workspace size was about `25M`.
- The real workspace path remained the decomposed-Unicode NFD path used in Experiment 1c.
