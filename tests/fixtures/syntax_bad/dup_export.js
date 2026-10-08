// NC syntax 4: duplicate export name
export const x = 1;
export { x };
export function x2() {}
export { x2 as x };
