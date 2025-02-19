import axios from "axios";

type T_LOG_LEVEL = "INFO" | "WARN" | "ERROR";

type T_SYMBOLS = {
  INFO: "[+]";
  WARN: "[!]";
  ERROR: "[!!]";
};

type T_SYMBOL = "[+]" | "[!]" | "[!!]";

enum E_WEBHOOKS {
  info,
  warn,
  error,
}

export default class Logger {
  private static SYMBOLS: T_SYMBOLS = Object.freeze({
    INFO: "[+]",
    WARN: "[!]",
    ERROR: "[!!]",
  });

  private static LOG_LEVEL: T_LOG_LEVEL | null = null;

  private static log(message: string, symbol: T_SYMBOL) {
    console.log(symbol, message);
  }

  private static async webhook(
    logtype: E_WEBHOOKS,
    message: string,
    silent?: boolean,
  ): Promise<boolean | null> {
    if (process.env.STATE !== "prod") {
      return null;
    }

    const sendRequest = async (
      url: string,
      color: number,
    ): Promise<boolean> => {
      const data = {
        flags: silent ? 4096 : undefined,
        embeds: [
          {
            description: message,
            color: color,
          },
        ],
      };

      const res = await axios.post(url, data, {
        validateStatus: () => true,
        timeout: 4000,
      });

      if (res.status === 204) {
        return true;
      } else {
        console.log("ERROR: webhook failed with status " + res.status);
        return false;
      }
    };

    switch (logtype) {
      case E_WEBHOOKS.info:
        return await sendRequest(
          process.env.INFO_WEBHOOK!,
          parseInt(process.env.INFO_COLOR!),
        );
      case E_WEBHOOKS.warn:
        return await sendRequest(
          process.env.WARN_WEBHOOK!,
          parseInt(process.env.WARN_COLOR!),
        );
      case E_WEBHOOKS.error:
        return await sendRequest(
          process.env.ERROR_WEBHOOK!,
          parseInt(process.env.ERROR_COLOR!),
        );
    }
  }

  public static setLogLevel(loglevel: T_LOG_LEVEL) {
    this.LOG_LEVEL = loglevel;
  }

  public static info(message: string) {
    this.log(message, this.SYMBOLS.INFO);
    this.webhook(E_WEBHOOKS.info, message);
  }

  public static warn(message: string) {
    this.log(message, this.SYMBOLS.WARN);
    this.webhook(E_WEBHOOKS.warn, message);
  }

  public static error(message: string) {
    this.log(message, this.SYMBOLS.ERROR);
    this.webhook(E_WEBHOOKS.error, message);
  }
}
