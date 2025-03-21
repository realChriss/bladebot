import ClientEvent from "../classes/ClientEvent";
import { Events, Interaction, ButtonInteraction } from "discord.js";
import prisma from "../../db/prisma";
import MessageSender from "../classes/MessageSender";
import Logger from "../../utils/Logger";
import {
  sendDMWithFallback,
  updateOriginalEmbed,
  getAppliedMember,
  getApplication,
} from "../../utils/applicationActionUtils";

async function handleApplicationReject(interaction: ButtonInteraction) {
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
    authorName: process.env.CLAN_NAME,
    title: "You have been rejected",
    description: `You have been rejected from joining **${process.env.CLAN_NAME}**`,
    footerText: "Create a ticket for more information",
  };
  const dmEmbed = new MessageSender(null, embedContent, {
    state: EMessageReplyState.error,
  }).getEmbed();

  await sendDMWithFallback(appliedMember, dmEmbed, async () => {
    const error = `Could not DM ${appliedMember.user.username} for rejection`;
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send(error);
    }
    Logger.warn(error);
  });

  const embed = new MessageSender(
    null,
    {
      authorImg: appliedMember.displayAvatarURL(),
      authorName: appliedMember.displayName,
      description: `Rejected **${appliedMember.user.username}**'s application`,
      footerText: interaction.user.username,
    },
    { state: EMessageReplyState.success },
  ).getEmbed();

  await interaction.editReply({
    embeds: [embed],
  });

  await updateOriginalEmbed(
    interaction,
    `Rejected by ${interaction.member?.user.username}`,
    0xff0000,
  );
}

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === "application_reject") {
      await handleApplicationReject(interaction);
    }
  },
};

export default event;
