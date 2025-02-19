import prisma from "../db/prisma";

export default class ConfigManager {
  public static async getConfig() {
    return await prisma.config.findFirst();
  }
  public static async appIsOpen() {
    const config = await this.getConfig();
    return config?.app_open ? true : false;
  }
  public static async closeApp() {
    await prisma.$executeRaw`SELECT close_applications();`;
  }
  public static async openApp() {
    await prisma.$executeRaw`SELECT open_applications();`;
  }
}
