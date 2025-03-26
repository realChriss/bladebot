const evalStore = new Map<string, string>();

export function saveLastEval(userId: string, code: string) {
  evalStore.set(userId, code);
}

export function getLastEval(userId: string) {
  return evalStore.get(userId) || '';
}