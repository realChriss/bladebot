import prisma from "../db/prisma";
import { config } from "@prisma/client";

export default class ConfigManager {
  private static async setOption<K extends keyof config>(
    key: K,
    value: config[K],
  ) {
    await prisma.config.update({
      where: { id: 1 },
      data: { [key]: value },
    });
  }

  public static async getConfig() {
    return await prisma.config.findFirst();
  }

  public static async isAppOpen() {
    const config = await this.getConfig();
    return config?.app_open === true;
  }

  public static async setAppOpen(value: boolean) {
    await this.setOption("app_open", value);
  }

  public static async isWlcMsgOn() {
    const config = await this.getConfig();
    return config?.send_wlc_msg === true;
  }

  public static async setWlcMsg(value: boolean) {
    await this.setOption("send_wlc_msg", value);
  }
}
