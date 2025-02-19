import { IClientCommand } from "../types/ClientCommand";
import { TCommandFunction } from "../types/CommandFunction";
import { TCommandOptions } from "../types/CommandOptions";

export default class ClientCommand implements IClientCommand {
  readonly command: TCommandFunction;
  readonly aliases: string[];
  readonly options: TCommandOptions;
  readonly description?: string;

  constructor(
    command: TCommandFunction,
    aliases: string[],
    options: TCommandOptions,
    description?: string,
  ) {
    this.command = command;
    this.aliases = aliases;
    this.options = options;
    this.description = description;
  }
}
