export type TCooldownRemovalQueue = {
  [query: string]: NodeJS.Timeout | number;
};
