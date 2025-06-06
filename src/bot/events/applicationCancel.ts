import ClientEvent from "../classes/ClientEvent";
import { Events, Interaction } from "discord.js";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import Logger from "../../utils/Logger";
import { logApplicationAction } from "../../utils/applicationStatsUtils";
import { env } from "../../env";

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "application_cancel"
    ) {
      return;
    }

    await interaction.deferUpdate();

    const application = await prisma.application.findFirst({
      where: {
        user_id: interaction.user.id,
      },
    });

    if (!application) {
      const embed = new MessageSender(
        null,
        {
          description: "No active application found.",
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      return;
    }

    if (application.pending_msg_id !== null) {
      const embed = new MessageSender(
        null,
        {
          description:
            "You cannot cancel an application that has been accepted.",
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      return;
    }

    await prisma.application
      .delete({
        where: {
          user_id_msg_id: {
            user_id: application.user_id,
            msg_id: application.msg_id,
          },
        },
      })
      .catch((error) => {
        Logger.error(error);
        return null;
      });

    const responseEmbed = new MessageSender(
      null,
      {
        description: "Your application has been cancelled successfully.",
      },
      { state: EMessageReplyState.success },
    ).getEmbed();

    await interaction.editReply({
      embeds: [responseEmbed],
      components: [],
    });

    const applicationChannel = interaction.guild?.channels.cache.get(
      env.APPLICATION_CHANNEL,
    );

    if (applicationChannel?.isTextBased()) {
      const applicationMessage = await applicationChannel.messages
        .fetch(application.msg_id)
        .catch(() => {
          Logger.error("Application message not found");
          return null;
        });

      if (applicationMessage) {
        await applicationMessage.edit({
          embeds: [
            {
              ...applicationMessage.embeds[0].data,
              footer: { text: `Application cancelled by user` },
              color: 0xffbe01,
            },
          ],
          components: [],
        });

        const embed: TMessageEmbed = {
          description: "Application has been cancelled by the user.",
          color: 0xffbe01,
        };

        await applicationMessage.reply({
          embeds: [embed],
        });
      }
    } else {
      Logger.error("Application channel not found");
    }

    await logApplicationAction(application, "cancelled", interaction.user.id);

    Logger.info(`Application self cancelled by ${interaction.user.username}`);
  },
};

export default event;
