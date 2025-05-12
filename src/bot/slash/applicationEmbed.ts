import {
  ChatInputCommandInteraction,
  Client,
  SendableChannels,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import { env } from "../../env";

const components = [
  {
    type: 1,
    components: [
      {
        type: 2,
        label: "Apply",
        style: 1,
        custom_id: "apply_modal_open",
      },
    ],
  },
];

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Sends the application embed"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await (interaction.channel as SendableChannels).send({
      embeds: [
        {
          author: {
            name: env.CLAN_NAME,
          },
          title: `Apply to ${env.CLAN_NAME}`,
          description:
            "To apply click the button below and answer the questions!",
          color: 0xffffff,
        },
      ],
      components,
    });

    interaction.reply({
      content: "Done",
      ephemeral: true,
    });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};
export default command;
