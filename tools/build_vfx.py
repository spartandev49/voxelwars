#!/usr/bin/env python3
"""Downscale selected Kenney Particle Pack (CC0) sprites to <=256px PNG (alpha kept) -> assets/vfx/<id>.png ; writes assets/_vfx_build.json"""
import os, subprocess, json
SRC = '/home/user/voxelwars/assets/raw/kenney-particle-pack/files/PNG (Transparent)'
OUT = '/home/user/voxelwars/assets/vfx'
os.makedirs(OUT, exist_ok=True)
# id -> (tags, notes)
PICK = {
 'smoke_01': 'smoke,puff,dust,soft', 'smoke_04': 'smoke,puff,cloud', 'smoke_07': 'smoke,wisp,trail', 'smoke_09': 'smoke,puff,heavy',
 'fire_01': 'fire,flame,burn', 'fire_02': 'fire,flame,burn', 'flame_01': 'flame,fire,torch', 'flame_03': 'flame,fire,torch', 'flame_05': 'flame,ember,small',
 'spark_01': 'spark,hit,impact', 'spark_03': 'spark,hit,impact', 'spark_05': 'spark,clash,metal', 'spark_07': 'spark,glint',
 'slash_01': 'slash,sword,swipe', 'slash_02': 'slash,sword,swipe', 'slash_03': 'slash,claw,swipe', 'slash_04': 'slash,sword,swipe',
 'muzzle_01': 'impact,burst,flash', 'muzzle_03': 'impact,burst,flash', 'scratch_01': 'scratch,claw,decal',
 'star_01': 'star,sparkle,confetti', 'star_04': 'star,sparkle,victory', 'star_06': 'star,sparkle,victory',
 'magic_01': 'magic,glow,heal', 'magic_03': 'magic,glow,spell', 'magic_05': 'magic,glow,curse',
 'circle_02': 'circle,ring,shockwave', 'circle_05': 'circle,glow,soft', 'flare_01': 'flare,glow,light', 'light_01': 'light,glow,flash',
 'dirt_01': 'dirt,debris,rubble', 'dirt_03': 'dirt,debris,rubble', 'scorch_01': 'scorch,burn,decal', 'twirl_01': 'twirl,whirl,wind', 'trace_01': 'trace,trail,streak',
}
res = {}
for pid, tags in PICK.items():
    src = os.path.join(SRC, pid + '.png'); dst = os.path.join(OUT, pid + '.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', src, '-vf', 'scale=256:256:flags=lanczos', '-pix_fmt', 'rgba', '-compression_level', '9', dst], check=True)
    res[pid] = dict(size=os.path.getsize(dst), tags=tags.split(','), width=256, height=256)
json.dump(res, open('/home/user/voxelwars/assets/_vfx_build.json', 'w'), indent=1)
print(len(res), 'sprites', sum(v['size'] for v in res.values()), 'bytes')
