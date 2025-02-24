import {
  ChatInputCommandInteraction,
  Client,
  SendableChannels,
  SlashCommandBuilder,
  TextBasedChannel,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import ConfigManager from "../../utils/ConfigManager";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";
import { stat } from "fs";

async function reply(
  integraton: ChatInputCommandInteraction,
  sucess: boolean,
  content: string,
) {
  const embed = new MessageSender(
    null,
    {
      description: content,
      footerText: integraton.user.username,
    },
    {
      state: sucess ? EMessageReplyState.success : EMessageReplyState.error,
    },
  );

  await integraton.reply({
    embeds: [embed.getEmbed()],
  });
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure bot settings")
    .addSubcommand((subcommand) =>
      subcommand.setName("open").setDescription("Enables applications"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("close").setDescription("Disables applications"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable-welcome")
        .setDescription("Enables welcome message"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable-welcome")
        .setDescription("Disables welcome message"),
    ) as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    if (interaction.options.getSubcommand() === "open") {
      await ConfigManager.setAppOpen(true);
      await reply(interaction, true, "Applications are now open");
    } else if (interaction.options.getSubcommand() === "close") {
      await ConfigManager.setAppOpen(false);
      await reply(interaction, true, "Applications are now closed");
    } else if (interaction.options.getSubcommand() === "enable-welcome") {
      await ConfigManager.setWlcMsg(true);
      await reply(interaction, true, "Welcome message is now enabled");
    } else if (interaction.options.getSubcommand() === "disable-welcome") {
      await ConfigManager.setWlcMsg(false);
      await reply(interaction, true, "Welcome message is now disabled");
    }
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};
export default command;
