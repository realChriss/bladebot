import { TEventRun } from "./EventRun";

export interface IClientEvent {
  name: string;
  run: TEventRun;
  description?: string;
}
