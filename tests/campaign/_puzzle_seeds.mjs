// Hand-made starting candidates for the puzzle solver (what a thoughtful player would try first). The solver improves on them.
import { group } from './_solver.mjs';
export const SEEDS = {
  spear_wall: [[...group('hoplite', 10, -21, 0, 'line', 'hold', 1, 1.5)], [...group('hoplite', 10, -21, 0, 'line', 'advance', 1, 1.5)], [...group('hoplite', 12, -21, 0, 'line', 'hold', 1, 1.5), ...group('peltast', 2, -24, 0, 'line', 'hold', 2)]],
  kiting_101: [[...group('cretan_archer', 10, -24, 0, 'line', 'advance', 1)], [...group('cretan_archer', 10, -24, 0, 'line', 'hold', 1)]],
  elephant_room: [[...group('hoplite', 10, -20, 0, 'line', 'hold', 1, 1.5), ...group('nubian_archer', 8, -24, 0, 'line', 'hold', 2)], [...group('hoplite', 12, -20, 0, 'line', 'hold', 1, 1.5), ...group('nubian_archer', 4, -24, 0, 'line', 'hold', 2), ...group('peltast', 4, -24, 5, 'line', 'hold', 3)]],
  knock_knock: [[...group('catapult', 4, -46, 0, 'line', 'hold', 1, 3)], [...group('catapult', 5, -46, 0, 'line', 'hold', 1, 3)]],
  goat_logistics: [[...group('hoplite', 6, -18, -14, 'block', 'advance', 1), ...group('cretan_archer', 4, -22, -18, 'line', 'advance', 2)]],
  gaze_avoidance: [[...group('cretan_archer', 8, -24, 0, 'line', 'advance', 1), ...group('companion_cavalry', 1, -22, 6, 'line', 'advance', 2)]],
};
