const userInputStore = new Map<string, ApplyStore>();

interface ApplyStore {
  robloxUsername: string;
  age: string;
  killCount: string;
  winCount: string;
}

export function saveUserInput(
  userId: string,
  robloxUsername: string,
  age: string,
  killCount: string,
  winCount: string,
) {
  userInputStore.set(userId, {
    robloxUsername,
    age,
    killCount,
    winCount,
  });
}

export function getUserInput(userId: string) {
  return (
    userInputStore.get(userId) || {
      robloxUsername: "",
      age: "",
      killCount: "",
      winCount: "",
    }
  );
}
