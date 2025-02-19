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

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Disables applications"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await ConfigManager.closeApp();

    const response = new MessageSender(
      null,
      {
        description: "Applications closed",
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
