import ClientEvent from "../classes/ClientEvent";
import { Events, Interaction, ButtonInteraction } from "discord.js";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import Logger from "../../utils/Logger";
import {
  sendDMWithFallback,
  updateOriginalEmbed,
  getAppliedMember,
  getApplication,
} from "../../utils/applicationActionUtils";
import { logApplicationAction } from "../../utils/applicationStatsUtils";
import { env } from "../../env";

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "application_delete"
    ) {
      return;
    }

    await interaction.deferReply();

    const application = await getApplication(interaction);
    if (!application) {
      return;
    }

    await prisma.application.delete({
      where: {
        user_id_msg_id: {
          user_id: application.user_id,
          msg_id: application.msg_id,
        },
      },
    });

    const appliedMember = await getAppliedMember(interaction, application);
    if (!appliedMember) {
      return;
    }

    const embedContent: TMessageReplyPayload = {
      authorName: env.CLAN_NAME,
      title: "Your application has been deleted",
      description: `Your application at **${env.CLAN_NAME}** has been deleted.\nThis could be due to various reasons.\nYou can reapply at any time.`,
      footerText: "Create a ticket for more information",
      color: 0xf49f00,
    };
    const dmEmbed = new MessageSender(null, embedContent, {
      state: EMessageReplyState.none,
    }).getEmbed();

    await sendDMWithFallback(appliedMember, dmEmbed, async () => {
      const error = `Could not DM ${appliedMember.user.username}`;
      if (interaction.channel?.isSendable()) {
        await interaction.channel.send(error);
      }
      Logger.warn(error);
    });

    await appliedMember.roles.remove([
      env.TRYOUT_PENDING_ROLE!,
      env.WAITLIST_ROLE!,
    ]);

    const embed = new MessageSender(
      null,
      {
        authorImg: appliedMember.displayAvatarURL(),
        authorName: appliedMember.displayName,
        description: `🗑️ Deleted **${appliedMember.user.username}**'s application`,
        footerText: interaction.user.username,
      },
      { state: EMessageReplyState.success },
    ).getEmbed();

    await interaction.editReply({
      embeds: [embed],
    });

    await updateOriginalEmbed(
      interaction,
      `Deleted by ${interaction.member?.user.username}`,
      0xa0a0a0,
    );

    await logApplicationAction(application, "deleted", interaction.user.id);
  },
};

export default event;
