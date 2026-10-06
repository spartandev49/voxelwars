#!/usr/bin/env bash
# Download Kenney CC0 packs into assets/raw/kenney-<slug>/ and unzip safely.
# Usage: tools/fetch_kenney.sh
set -euo pipefail
ROOT=/home/user/voxelwars/assets/raw
declare -A PACKS=(
 [impact-sounds]=https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip
 [rpg-audio]=https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip
 [interface-sounds]=https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
 [ui-audio]=https://kenney.nl/media/pages/assets/ui-audio/490d233f68-1677590494/kenney_ui-audio.zip
 [digital-audio]=https://kenney.nl/media/pages/assets/digital-audio/216eac4753-1677590265/kenney_digital-audio.zip
 [music-jingles]=https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip
 [particle-pack]=https://kenney.nl/media/pages/assets/particle-pack/f8fe0f8cb8-1677578741/kenney_particle-pack.zip
 [casino-audio]=https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip
 [voiceover-pack-fighter]=https://kenney.nl/media/pages/assets/voiceover-pack-fighter/6ceb77c6f1-1677589837/kenney_voiceover-pack-fighter.zip
 [voiceover-pack]=https://kenney.nl/media/pages/assets/voiceover-pack/3f7f168698-1677589897/kenney_voiceover-pack.zip
)
for slug in "${!PACKS[@]}"; do
  d="$ROOT/kenney-$slug"
  [ -d "$d" ] && { echo "skip $slug"; continue; }
  mkdir -p "$d/zip"
  curl -sS -L -m 300 -o "$d/zip/pack.zip" "${PACKS[$slug]}"
  # check for path traversal before unzip
  if unzip -Z1 "$d/zip/pack.zip" | grep -E '(^/|\.\./)' ; then echo "UNSAFE PATHS in $slug"; continue; fi
  mkdir -p "$d/files"
  unzip -q -d "$d/files" "$d/zip/pack.zip"
  echo "$slug: $(find "$d/files" -type f | wc -l) files"
done
