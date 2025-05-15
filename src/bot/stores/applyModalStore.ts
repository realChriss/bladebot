const userInputStore = new Map<string, ApplyStore>();

type ApplyStore = {
  robloxUsername: string;
  age: string;
  killCount: string;
  winCount: string;
  device: string;
  country: string;
};

export function saveUserInput(
  userId: string,
  robloxUsername: string,
  age: string,
  killCount: string,
  winCount: string,
  device: string,
  country: string,
) {
  userInputStore.set(userId, {
    robloxUsername,
    age,
    killCount,
    winCount,
    device,
    country,
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
      country: "",
    }
  );
}
