// Renders the exact boot markup that tools/build.mjs emits (#vw-boot .boot-logo .boot-bar .boot-msg) so the loader CSS can be reviewed.
const root = document.getElementById('vw-root');
const boot = document.createElement('div'); boot.id = 'vw-boot';
const logo = document.createElement('div'); logo.className = 'boot-logo'; logo.textContent = 'VOXELWARS';
const bar = document.createElement('div'); bar.className = 'boot-bar'; bar.appendChild(document.createElement('i'));
const msg = document.createElement('div'); msg.className = 'boot-msg'; msg.textContent = 'Polishing helmets…';
boot.append(logo, bar, msg); root.appendChild(boot);
