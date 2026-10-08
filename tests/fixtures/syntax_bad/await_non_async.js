// NC syntax 5: await in a non-async function
export function f() {
  return await Promise.resolve(1);
}
