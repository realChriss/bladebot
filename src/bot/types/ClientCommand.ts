import { TCommandFunction } from "./CommandFunction";
import { TCommandOptions } from "./CommandOptions";

export interface IClientCommand {
  command: TCommandFunction;
  aliases: string[];
  options: TCommandOptions;
  description?: string;
}
