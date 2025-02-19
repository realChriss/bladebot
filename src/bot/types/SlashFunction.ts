import { ChatInputCommandInteraction, Client } from "discord.js";

export type TSlashFunction = (
  client: Client,
  interaction: ChatInputCommandInteraction,
  ...args: any[]
) => void | Error | Promise<void> | Promise<Error>;
