import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import ConfigManager from "../../utils/ConfigManager";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("open")
    .setDescription("Enables applications"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await ConfigManager.setAppOpen(true);

    const response = new MessageSender(
      null,
      {
        description: "Applications opened",
        footerText: interaction.member?.user.username,
      },
      {
        state: EMessageReplyState.success,
      },
    );

    await interaction.reply({
      embeds: [response.getEmbed()],
    });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};
export default command;
