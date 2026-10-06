#!/usr/bin/env bash
# Reproduce the whole asset pipeline (downloads are untrusted data: each goes in its own raw/<source> dir, nothing is executed).
# Needs: ffmpeg/ffprobe, python3.11, curl, unzip; `pip install --target .cache/pylib numpy py7zr` once (numpy for DSP, py7zr for .7z packs).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d .cache/pylib ] || pip install --target .cache/pylib numpy py7zr
tools/fetch_kenney.sh                                         # Kenney CC0 packs (impact, rpg, interface, ui, particles, voiceover ...)
python3 -I tools/fetch_oga.py $(cat tools/sources_oga.txt)   # OpenGameArt packs (licence-checked: CC0 / CC-BY 3.0 / 4.0 only)
python3 -I tools/fetch_incompetech.py "Heroic Age" "Grim League" "Clenched Teeth" "Dark Star" "Desert City" "Bumbly March"   # Kevin MacLeod, CC BY 4.0
python3 -I tools/fetch_commons.py @tools/commons_wanted.txt  # Wikimedia Commons (PD / CC0 / CC BY); rate limited -> re-run later if it stops on HTTP 429
python3 -I tools/build_sfx.py                                 # -> assets/audio/sfx/*.mp3 (+ masters/)
python3 -I tools/build_music.py                               # -> assets/audio/music/*.mp3 (+ masters/)
python3 -I tools/build_vfx.py                                 # -> assets/vfx/*.png
python3 -I tools/build_manifest.py                            # -> assets/manifest.json + assets/CREDITS.md
python3 -I tools/verify_assets.py                             # decode / loudness / licence checks
