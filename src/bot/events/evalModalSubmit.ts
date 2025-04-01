import { AttachmentBuilder, Events, Interaction } from "discord.js";
import { EVAL_MODAL_ID, EVAL_INPUT_ID } from "../slash/eval";
import { saveLastEval } from "../stores/evalModalStore";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import ClientEvent from "../classes/ClientEvent";

const event: ClientEvent = {
  name: Events.InteractionCreate,
  async run(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== EVAL_MODAL_ID) return;

    const code = interaction.fields.getTextInputValue(EVAL_INPUT_ID);
    saveLastEval(interaction.user.id, code);

    let result;
    const startTime = process.hrtime();

    try {
      result = await eval(code);
    } catch (error) {
      result = error;
    }

    const executionTime = process.hrtime(startTime);
    const msTime = (executionTime[0] * 1000 + executionTime[1] / 1e6).toFixed(
      2,
    );

    const resultStr =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);

    const file = new AttachmentBuilder(Buffer.from(code), {
      name: "eval-code.js",
    });

    const embed = new MessageSender(
      null,
      {
        title: "Eval Result",
        description: `\`\`\`js\n${resultStr.slice(0, 2000)}\`\`\``,
        fields: [
          { name: "Type", value: `\`${typeof result}\``, inline: true },
          { name: "Execution Time", value: `\`${msTime}ms\``, inline: true },
        ],
        footerText: interaction.user.tag,
      },
      { state: EMessageReplyState.success },
    );

    await interaction.reply({
      embeds: [embed.getEmbed()],
      files: [file],
    });
  },
};

export default event;
