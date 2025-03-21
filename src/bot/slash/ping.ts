import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  SendableChannels,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Shows the ping"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const ms = new Date().getTime();
    const test = await (interaction.channel as SendableChannels).send(
      "test ping",
    );

    const replyObj = new MessageSender(
      test,
      {
        title: "Pong 🏓",
        description: `Connection:\nClient Ping: ${test.createdTimestamp - ms}ms\nWS Ping: ${client.ws.ping}ms`,
        footerText: interaction.user.username,
      },
      {
        state: EMessageReplyState.success,
      },
    );

    await Promise.allSettled([
      interaction.editReply({
        embeds: [replyObj.getEmbed()],
      }),
      test.delete(),
    ]);
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowEveryone: true,
    cooldown: 5,
  },
};
export default command;
