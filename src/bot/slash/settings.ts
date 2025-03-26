import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import ConfigManager from "../../utils/ConfigManager";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";

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

  await interaction.reply({
    embeds: [embed.getEmbed()],
  });
}

const settingsMap: Record<
  string,
  { action: () => Promise<void | string> | void; message: string }
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
  show: {
    action: async () => {
      const config = await ConfigManager.getConfig();

      if (!config) {
        return "Failed to fetch settings";
      }

      return `Current Settings:\n• Applications: ${config.app_open ? "Open" : "Closed"}\n• Welcome Message: ${config.send_wlc_msg ? "Enabled" : "Disabled"}`;
    },
    message: "",
  },
};

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure bot settings")
    .addSubcommand((subcommand) =>
      subcommand.setName("open").setDescription("Opens applications"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("close").setDescription("Closes applications"),
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
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("show").setDescription("Shows current settings"),
    ) as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    const setting = settingsMap[subcommand];

    if (setting) {
      const result = await setting.action();
      await reply(interaction, true, result || setting.message);
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
