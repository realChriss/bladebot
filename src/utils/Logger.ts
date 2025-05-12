import axios, { AxiosResponse } from "axios";
import { env } from "../env";

export type LogLevel = "INFO" | "WARN" | "ERROR";

const SYMBOLS: Record<LogLevel, string> = {
  INFO: "[+]",
  WARN: "[!]",
  ERROR: "[!!]",
};

interface WebhookConfig {
  url: string;
  color: number;
}

const WEBHOOKS: Record<LogLevel, WebhookConfig> = {
  INFO: {
    url: env.INFO_WEBHOOK,
    color: parseHexColor(env.INFO_COLOR),
  },
  WARN: {
    url: env.WARN_WEBHOOK,
    color: parseHexColor(env.WARN_COLOR),
  },
  ERROR: {
    url: env.ERROR_WEBHOOK,
    color: parseHexColor(env.ERROR_COLOR),
  },
};

function parseHexColor(color: string): number {
  const hex = color.replace(/^#/, "");
  const parsed = parseInt(hex, 16);
  return isNaN(parsed) ? 0 : parsed;
}

export default class Logger {
  private static currentLevel: LogLevel = "INFO";

  public static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private static shouldLog(level: LogLevel): boolean {
    const order: LogLevel[] = ["INFO", "WARN", "ERROR"];
    return order.indexOf(level) >= order.indexOf(this.currentLevel);
  }

  private static async sendWebhook(
    level: LogLevel,
    message: string,
    silent = false,
  ): Promise<boolean> {
    if (env.STATE !== "prod") {
      return false;
    }

    const config = WEBHOOKS[level];
    if (!config.url) {
      console.warn(`${SYMBOLS.WARN} Missing webhook URL for level ${level}`);
      return false;
    }

    const payload = {
      flags: silent ? 4096 : undefined,
      embeds: [{ description: message, color: config.color }],
    };

    try {
      const response: AxiosResponse = await axios.post(config.url, payload, {
        validateStatus: () => true,
        timeout: 4000,
      });
      if (response.status === 204) return true;
      console.error(
        `${SYMBOLS.ERROR} Webhook failed (${level}) with status ${response.status}`,
      );
      return false;
    } catch (error) {
      console.error(`${SYMBOLS.ERROR} Webhook error:`, error);
      return false;
    }
  }

  public static info(message: string, silent = false): void {
    if (!this.shouldLog("INFO")) return;
    console.log(SYMBOLS.INFO, message);
    void this.sendWebhook("INFO", message, silent);
  }

  public static warn(message: string, silent = false): void {
    if (!this.shouldLog("WARN")) return;
    console.warn(SYMBOLS.WARN, message);
    void this.sendWebhook("WARN", message, silent);
  }

  public static error(message: string, silent = false): void {
    if (!this.shouldLog("ERROR")) return;
    console.error(SYMBOLS.ERROR, message);
    void this.sendWebhook("ERROR", message, silent);
  }
}
