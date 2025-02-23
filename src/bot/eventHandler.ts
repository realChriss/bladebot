import { TEventCollection } from "./types/EventCollection";
import path from "node:path";
import fs from "node:fs";
import ClientEvent from "./classes/ClientEvent";
import Logger from "../utils/Logger";
import client from "./client";

const lockableCustomIds = [
  "application_accept",
  "application_reject",
  "application_delete",
  "clan_invite_sent",
];

class InteractionLocker {
  private static locks: Set<string> = new Set();

  public static requiresLock(customId: string): boolean {
    return lockableCustomIds.includes(customId);
  }

  public static lock(lockKey: string): boolean {
    if (this.locks.has(lockKey)) {
      return false;
    }
    this.locks.add(lockKey);
    return true;
  }

  public static unlock(lockKey: string): void {
    this.locks.delete(lockKey);
  }
}

export default class EventHandler {
  private static events: TEventCollection = new Map();

  private static setupHandlers() {
    for (const [eventName, handlers] of this.events) {
      client.on(eventName, async (...args: any[]) => {
        const interaction = args?.[0];
        let lockKey: string | undefined;

        if (
          interaction?.customId &&
          InteractionLocker.requiresLock(interaction.customId)
        ) {
          lockKey = interaction.message?.id ?? interaction.customId;

          if (!lockKey) {
            return;
          }

          if (!InteractionLocker.lock(lockKey)) {
            if (!interaction.deferred && !interaction.replied) {
              await interaction.reply({
                ephemeral: true,
                content:
                  "Another action on this interaction is in progress. Please wait.",
              });
            }
            return;
          }
        }

        try {
          for (const handler of handlers) {
            await handler(...args);
          }
        } catch (error: any) {
          Logger.error(
            `Error handling event ${eventName}: ${error.message}\n${error.stack}`,
          );
        } finally {
          if (lockKey) {
            InteractionLocker.unlock(lockKey);
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
