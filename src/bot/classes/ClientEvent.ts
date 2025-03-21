export default class ClientEvent implements IClientEvent {
  readonly name: string;
  readonly run: TEventRun;
  readonly description?: string;

  constructor(name: string, run: TEventRun, description?: string) {
    this.name = name;
    this.run = run;
    this.description = description;
  }
}
