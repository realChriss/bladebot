const userInputStore = new Map<string, ApplyStore>();

type ApplyStore = {
  robloxUsername: string;
  age: string;
  killCount: string;
  winCount: string;
  device: string;
};

export function saveUserInput(
  userId: string,
  robloxUsername: string,
  age: string,
  killCount: string,
  winCount: string,
  device: string,
) {
  userInputStore.set(userId, {
    robloxUsername,
    age,
    killCount,
    winCount,
    device,
  });
}

export function getUserInput(userId: string): ApplyStore {
  return (
    userInputStore.get(userId) || {
      robloxUsername: "",
      age: "",
      killCount: "",
      winCount: "",
      device: "",
    }
  );
}
