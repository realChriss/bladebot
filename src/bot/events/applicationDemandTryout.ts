import ClientEvent from "../classes/ClientEvent";
import { Events, Interaction, EmbedBuilder } from "discord.js";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  getAppliedMember,
  getApplication,
  RegionInfo,
  getRegionFromRoles,
} from "../../utils/applicationActionUtils";
import Emoji from "../assets/emoji";
import { env } from "../../env";
import prisma from "../../db/prisma";
import { buildMessageUrl } from "../../utils/stringUtils";

function getTryoutMsgUrl(msgId: string): string {
  return buildMessageUrl(env.TRYOUT_CHANNEL!, msgId);
}

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "application_demand_tryout"
    ) {
      return;
    }

    await interaction.deferReply();

    const application = await getApplication(interaction);
    if (!application) {
      return;
    }

    const appliedMember = await getAppliedMember(interaction, application);
    if (!appliedMember) {
      return;
    }

    if (
      appliedMember.roles.cache.has(env.TRYOUT_PENDING_ROLE!) &&
      application.tryout_msg_id
    ) {
      const alreadyInQueueEmbed = new MessageSender(
        null,
        {
          authorImg: appliedMember.displayAvatarURL(),
          authorName: appliedMember.displayName,
          description: `❌ **${appliedMember.user.username}** is already in the tryout queue.\n${application.tryout_msg_id ? `Tryout Message: [[Message]](${getTryoutMsgUrl(application.tryout_msg_id)})` : ""}`,
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.editReply({
        embeds: [alreadyInQueueEmbed],
      });
      return;
    }

    const userRegion = getRegionFromRoles(appliedMember.roles);

    if (!userRegion) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: `Could not determine ${appliedMember.user.username}'s region. Please make sure they have a region role.`,
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const tryoutChannel = interaction.client.channels.cache.get(
      env.TRYOUT_CHANNEL!,
    );

    if (!tryoutChannel || !tryoutChannel.isSendable()) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: `Could not find the tryout channel.`,
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const tryoutEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: appliedMember.displayName,
        iconURL: appliedMember.displayAvatarURL(),
      })
      .setTitle("Tryout Request")
      .setDescription(
        `**${appliedMember.user.username}** needs to be tried out.\n> **[${userRegion.name}]**\n\n**Tryout Rules:**\n• 1v1 against a tryouter\n• Long distance\n• Best of 5\n• No abilities (equip pulse ${Emoji.pulse})\n\nThe purpose of this tryout is to assess your skill level and gameplay understanding. Winning is not required.`,
      )
      .setThumbnail(application.roblox_headshot_url)
      .setTimestamp();

    await appliedMember.roles.add(env.TRYOUT_PENDING_ROLE!);

    const tryoutMessage = await tryoutChannel.send({
      content: `${appliedMember.toString()} <@&${userRegion.tryouterRoleId}>`,
      embeds: [tryoutEmbed],
    });

    await prisma.application.update({
      where: {
        user_id_msg_id: {
          user_id: application.user_id,
          msg_id: application.msg_id,
        },
      },
      data: {
        tryout_msg_id: tryoutMessage.id,
      },
    });

    const successEmbed = new MessageSender(
      null,
      {
        authorImg: appliedMember.displayAvatarURL(),
        authorName: appliedMember.displayName,
        description: `⚔️ Added **${appliedMember.user.username}** to tryout queue.\nRegion: **${userRegion.name}** | [[Message]](${tryoutMessage.url})`,
        footerText: interaction.user.username,
      },
      { state: EMessageReplyState.success },
    ).getEmbed();

    await interaction.editReply({
      embeds: [successEmbed],
    });
  },
};

export default event;
