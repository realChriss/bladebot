import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import { normalizeString } from "../../utils/stringUtils";

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("normalize-text")
    .setDescription("Normalizes text by removing special characters and diacritics")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to normalize")
        .setRequired(true)
        .setMaxLength(100)
    ) as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const text = interaction.options.getString("text", true);
    const normalizedText = normalizeString(text);
    
    const replyObj = new MessageSender(
      null,
      {
        title: "Text Normalized",
        fields: [
          {
            name: "📝 Original Text",
            value: `\`\`\`${text}\`\`\``,
            inline: false
          },
          {
            name: "✅ Normalized Result",
            value: `\`\`\`${normalizedText}\`\`\``,
            inline: false
          }
        ],
        footerText: `Requested by ${interaction.user.username}`,
      },
      {
        state: EMessageReplyState.success,
      }
    );

    await interaction.reply({
      embeds: [replyObj.getEmbed()],
    });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: true,
    allowEveryone: true,
  },
};

export default command;