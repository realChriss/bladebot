import { ActivityType, Events } from "discord.js";
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
    activities: [
      {
        name: process.env.CLAN_NAME!,
        type: ActivityType.Competing,
        state: "Made by @realchriss"
      },
    ],
    status: "dnd",
  });
}

client.login(process.env.CLIENT_TOKEN);
