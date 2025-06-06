import { SlashCommandBuilder } from "discord.js";

export default class ClientSlash {
  readonly exec: TSlashFunction;
  readonly data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  readonly options: TSlashOptions;
  readonly description?: string;
  constructor(
    exec: TSlashFunction,
    data: SlashCommandBuilder,
    options: TSlashOptions,
    description?: string,
  ) {
    this.exec = exec;
    this.data = data;
    this.options = options;
    this.description = description;
  }
}
