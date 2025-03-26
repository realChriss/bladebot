import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import { getLastEval } from "../stores/evalModalStore";

export const EVAL_MODAL_ID = 'eval_modal';
export const EVAL_INPUT_ID = 'eval_input';

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Execute JavaScript code") as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const lastCode = getLastEval(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId(EVAL_MODAL_ID)
      .setTitle('Evaluate JavaScript Code');

    const codeInput = new TextInputBuilder()
      .setCustomId(EVAL_INPUT_ID)
      .setLabel('Enter your code')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(lastCode)
      .setRequired(true);

    const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
      .addComponents(codeInput);

    modal.addComponents(actionRow);
    await interaction.showModal(modal);
  },
  options: {
    isDisabled: true,
    onlyBotChannel: false,
    allowChriss: true,
  },
};

export default command;