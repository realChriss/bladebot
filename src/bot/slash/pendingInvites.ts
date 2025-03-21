import MessageSender from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import Logger from "../../utils/Logger";

async function fetchInviteMessage(
  msgId: string,
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const channel = interaction.guild?.channels.cache.get(
    process.env.PENDING_INV_CHANNEL!,
  );
  if (!channel || !channel.isTextBased()) {
    Logger.error("Invite channel not found");
    return null;
  }

  return await channel.messages.fetch(msgId).catch(() => null);
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("list-invites")
    .setDescription("Shows all pending invites"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    const pendingInvites = await prisma.application.findMany({
      where: {
        pending_msg_id: {
          not: null,
        },
      },
    });
    const inviteCount = pendingInvites.length;

    const getEmbedFieldValue = async () => {
      return (
        await Promise.all(
          pendingInvites.map(async (x) => {
            const message = await fetchInviteMessage(
              x.pending_msg_id!,
              interaction,
            );
            return {
              robloxUser: x.roblox_user,
              url: message ? `[Jump](${message.url})` : "_Url Not Found_",
              timestamp: message
                ? `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`
                : "_No Time_",
              createdTimestamp: message?.createdTimestamp || 0,
            };
          }),
        )
      )
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
        .map(
          ({ robloxUser, url, timestamp }) =>
            `${robloxUser} — ${timestamp} — ${url}`,
        )
        .join("\n");
    };

    const getPendingInvitesText = (
      inviteCount: number,
      embedFieldValue: string,
    ) => {
      if (inviteCount > 0) {
        return `There ${inviteCount !== 1 ? "are" : "is"} ${inviteCount} pending invites\n\n**Pending Invites**\n${embedFieldValue}`;
      }

      return `There are no pending invites`;
    };

    const embedFieldValue = await getEmbedFieldValue();
    const embedDescription = getPendingInvitesText(
      inviteCount,
      embedFieldValue,
    );

    const replyObj = new MessageSender(
      null,
      {
        title: "Pending Invite List",
        description: embedDescription,
        footerText: interaction.user.username,
        color: 0xffffff,
      },
      {
        state: EMessageReplyState.none,
      },
    );

    await interaction.editReply({
      embeds: [replyObj.getEmbed()],
    });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};
export default command;
