import { ActivityType, Events } from "discord.js";
import client from "./client";
import Logger from "../utils/Logger";
import EventHandler from "./eventHandler";
import SlashHandler from "./slashHandler";
import moment from "moment-timezone";
import { env } from "../env";

moment.tz.setDefault("Europe/Berlin");

const PREFIX = env.PREFIX;

client.on(Events.ClientReady, async () => {
  await client.guilds.cache.get(env.SERVER_ID)?.members.fetch();
  await client.guilds.cache.get(env.SERVER_ID)?.roles.fetch();
  await client.guilds.cache.get(env.SERVER_ID)?.channels.fetch();

  await initEvents();
  initRPC();

  Logger.info(`Client is ready \`${moment().format("HH:mm:ss DD.MM.YYYY")}\``);
});

async function initEvents() {
  EventHandler.initEvents();
  await SlashHandler.initCommands();

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

    await SlashHandler.processCommand(interaction);
  });
}

function initRPC() {
  client.user?.setPresence({
    status: "dnd",
  });
}

client.login(env.CLIENT_TOKEN);
