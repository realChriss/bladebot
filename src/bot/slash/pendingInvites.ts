import MessageSender from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { EMessageReplyState } from "../types/MsgReplyState";
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

    const embedFieldValue = await getEmbedFieldValue();
    const embedDescription = `There are ${inviteCount > 0 ? inviteCount : "no"} pending invites\n\n**Pending Invites**\n${embedFieldValue}`;

    const replyObj = new MessageSender(
      null,
      {
        title: "Pending Invite List",
        description: embedDescription,
        authorName: interaction.user.username,
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
