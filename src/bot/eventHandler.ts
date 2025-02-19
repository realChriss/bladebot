import { TEventCollection } from "./types/EventCollection";
import path from "node:path";
import fs from "node:fs";
import ClientEvent from "./classes/ClientEvent";
import Logger from "../utils/Logger";
import client from "./client";

export default class EventHandler {
  private static events: TEventCollection = new Map();

  private static setupHandlers() {
    for (const [eventName, handlers] of this.events) {
      client.on(eventName, (...args: any[]) => {
        for (const handler of handlers) {
          try {
            handler(...args);
          } catch (error: any) {
            Logger.error(`Error handling event ${eventName}: ${error.message}`);
          }
        }
      });
    }
  }

  public static initEvents() {
    const files = fs.readdirSync(path.join(__dirname, "events"));

    for (const file of files) {
      if (
        (!file.endsWith(".ts") && !file.endsWith(".js")) ||
        file.startsWith("_")
      ) {
        Logger.warn("Skipping event file: " + file);
        continue;
      }

      const event: ClientEvent = require(
        path.join(__dirname, "events", file),
      ).default;
      const funcsInEvent = this.events.get(event.name);

      if (funcsInEvent) {
        funcsInEvent.push(event.run);
        this.events.set(event.name, funcsInEvent);
      } else {
        this.events.set(event.name, [event.run]);
      }
    }

    this.setupHandlers();
  }
}
