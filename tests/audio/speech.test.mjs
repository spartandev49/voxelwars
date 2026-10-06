// AU11: TTS announcer is OFF by default; once enabled it speaks only priority lines, at most 1 per 6 s, never above 2x speed; the voice picker
// and test button work; unsupported platforms degrade silently.
import assert from 'node:assert/strict';
import { Speech } from '../../src/audio/speech.js';
import { makeEngine } from './helpers.mjs';

const spoken = []; let cancels = 0, t = 100;
const synth = { speak: (u) => spoken.push(u), cancel: () => { cancels++; }, getVoices: () => [{ name: 'Alpha', lang: 'en-GB', default: true }, { name: 'Beta', lang: 'en-US', default: false }] };
class Utt { constructor(text) { this.text = text; this.rate = 1; this.volume = 1; this.voice = null; } }
const ducks = [];
const sp = new Speech({ synth, Utterance: Utt, now: () => t, duck: (b, db, ms) => ducks.push([b, db, ms]) });
assert.equal(sp.enabled, false, 'default OFF'); assert.equal(sp.speak('Hello', { priority: 3 }), false); assert.equal(spoken.length, 0);
assert.equal(sp.supported, true); assert.deepEqual(sp.voices().map((v) => v.name), ['Alpha', 'Beta']);
assert.equal(sp.setEnabled(true), true);
assert.equal(sp.speak('chatter', { priority: 1 }), false, 'low priority lines are skipped'); assert.equal(spoken.length, 0);
assert.equal(sp.speak('Zeus is angry', { priority: 2 }), true); assert.equal(spoken.length, 1); assert.equal(spoken[0].text, 'Zeus is angry');
t += 3; assert.equal(sp.speak('Another', { priority: 3 }), false, 'rate limit 1 per 6 s'); t += 3.1; assert.equal(sp.speak('Another', { priority: 3 }), true); assert.equal(spoken.length, 2);
t += 7; sp.setSpeed(4); assert.equal(sp.speak('Too fast', { priority: 3 }), false, 'skipped above 2x'); sp.setSpeed(2); assert.equal(sp.speak('At 2x', { priority: 3 }), true, 'allowed at 2x'); sp.setSpeed(1);
t += 7; sp.setVoice('Beta'); sp.speak('Voice pick', { priority: 3 }); assert.equal(spoken[spoken.length - 1].voice.name, 'Beta', 'voice picker');
assert.ok(ducks.length >= 3 && ducks.every((d) => d[0] === 'music' && d[1] < 0), 'music is ducked (approximately) while speaking');
const before = spoken.length; assert.equal(sp.test(), true); assert.equal(spoken.length, before + 1, 'test button ignores the rate limit'); assert.equal(sp.test('x'), true);
sp.setEnabled(false); assert.ok(cancels > 0); assert.equal(sp.speak('off again', { priority: 3 }), false);
assert.equal(new Speech({ synth: null, Utterance: null }).setEnabled(true), false, 'no speechSynthesis: stays off'); assert.equal(new Speech({ synth: null }).test(), false);
// engine integration: tts setting is read from settings, default off
{ const T = makeEngine({ settings: { get: (k) => (k === 'tts' ? false : undefined) } }); assert.equal(T.eng.speech.enabled, false); const T2 = makeEngine({ settings: { get: (k) => (k === 'tts' ? true : undefined) } }); assert.ok(T2.eng.speech.enabled === T2.eng.speech.supported); }
console.log('speech.test OK');
