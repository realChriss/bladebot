import { Events } from "discord.js";
import client from "./client";
import Logger from "../utils/Logger";
import EventHandler from "./eventHandler";
import SlashHandler from "./slashHandler";
import moment from "moment-timezone";

moment.tz.setDefault("Europe/Berlin");

const PREFIX = process.env.PREFIX!;

client.on(Events.ClientReady, async () => {
  await client.guilds.cache.get(process.env.SERVER_ID!)?.members.fetch();
  await client.guilds.cache.get(process.env.SERVER_ID!)?.roles.fetch();
  await client.guilds.cache.get(process.env.SERVER_ID!)?.channels.fetch();

  initEvents();

  Logger.info(`Client is ready \`${moment().format("HH:mm:ss DD.MM.YYYY")}\``);
});

function initEvents() {
  SlashHandler.initCommands();
  EventHandler.initEvents();

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

    await SlashHandler.processCommand(interaction);
  });
}

client.login(process.env.CLIENT_TOKEN);
