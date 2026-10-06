// NEGATIVE CONTROL for AU2: a build whose gesture gate has been removed (installGate never registers a listener).
export function installGate() { return () => {}; }
export function silentWavDataUri() { return ''; }
export function isIOSLike() { return false; }
