import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import ConfigManager from "../../utils/ConfigManager";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";

async function reply(
  interaction: ChatInputCommandInteraction,
  success: boolean,
  content: string,
) {
  const embed = new MessageSender(
    null,
    {
      description: content,
      footerText: interaction.user.username,
    },
    { state: success ? EMessageReplyState.success : EMessageReplyState.error },
  );

  await interaction.reply({ embeds: [embed.getEmbed()] });
}

const settingsMap: Record<
  string,
  { action: () => Promise<void>; message: string }
> = {
  open: {
    action: () => ConfigManager.setAppOpen(true),
    message: "Applications are now open",
  },
  close: {
    action: () => ConfigManager.setAppOpen(false),
    message: "Applications are now closed",
  },
  "enable-welcome": {
    action: () => ConfigManager.setWlcMsg(true),
    message: "Welcome message is now enabled",
  },
  "disable-welcome": {
    action: () => ConfigManager.setWlcMsg(false),
    message: "Welcome message is now disabled",
  },
};

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
    const subcommand = interaction.options.getSubcommand();
    const setting = settingsMap[subcommand];

    if (setting) {
      await setting.action();
      await reply(interaction, true, setting.message);
    } else {
      await reply(interaction, false, "Invalid subcommand.");
    }
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};

export default command;
