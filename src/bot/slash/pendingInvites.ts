import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import Logger from "../../utils/Logger";
import { application } from "@prisma/client";
import { env } from "../../env";

async function fetchInviteMessage(
  msgId: string,
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const channel = interaction.guild?.channels.cache.get(
    env.PENDING_INV_CHANNEL,
  );
  if (!channel || !channel.isTextBased()) {
    Logger.error("Invite channel not found");
    return null;
  }

  return await channel.messages.fetch(msgId).catch(() => null);
}

async function getInvitesListString(
  interaction: ChatInputCommandInteraction,
  pendingInvites: application[],
) {
  return (
    await Promise.all(
      pendingInvites.map(async (x) => {
        const message = await fetchInviteMessage(
          x.pending_msg_id!,
          interaction,
        );

        const discordUser = interaction.guild?.members.cache.get(x.user_id);

        if (!discordUser) {
          return null;
        }

        return {
          username: discordUser.displayName,
          url: message ? `[Jump](${message.url})` : "_Url Not Found_",
          timestamp: message
            ? `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`
            : "_No Time_",
          createdTimestamp: message?.createdTimestamp || 0,
        };
      }),
    )
  )
    .filter((x) => x !== null)
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .map(
      ({ username, url, timestamp }) => `${username} — ${timestamp} — ${url}`,
    )
    .join("\n");
}

function buildEmbedDescription(inviteCount: number, listString: string) {
  if (inviteCount > 0) {
    return `There ${inviteCount !== 1 ? "are" : "is"} ${inviteCount} pending invites\n\n**Pending Invites**\n${listString}`;
  }

  return `There are no pending invites`;
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

    const invitesListString = await getInvitesListString(
      interaction,
      pendingInvites,
    );
    const embedDescription = buildEmbedDescription(
      inviteCount,
      invitesListString,
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
    allowEveryone: true,
    cooldown: 20,
  },
};

export default command;
