import { Client, Message } from "discord.js";

export type TCommandFunction = (
  client: Client,
  msg: Message,
  ...args: any[]
) => void | Error | Promise<void> | Promise<Error>;
