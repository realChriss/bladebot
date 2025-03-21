import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import { application } from "@prisma/client";

async function fetchApplicationMessage(
  msgId: string,
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const channel = interaction.guild?.channels.cache.get(
    process.env.APPLICATION_CHANNEL!,
  );
  if (!channel || !channel.isTextBased()) {
    return null;
  }

  return await channel.messages.fetch(msgId).catch(() => null);
}

async function getApplicationsListString(
  interaction: ChatInputCommandInteraction,
  pendingApplications: application[],
) {
  return (
    await Promise.all(
      pendingApplications.map(async (x) => {
        const message = await fetchApplicationMessage(x.msg_id, interaction);

        const discordUser = interaction.guild?.members.cache.get(x.user_id);

        if (!discordUser) {
          return null;
        }

        return {
          username: discordUser.user.displayName,
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

function buildEmbedDescription(applicationCount: number, listString: string) {
  if (applicationCount > 0) {
    return `There ${applicationCount !== 1 ? "are" : "is"} ${applicationCount} pending invites\n\n**Pending Invites**\n${listString}`;
  }

  return `There are no pending invites`;
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("list-applications")
    .setDescription("Shows all pending applications"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    const pendingApplications = await prisma.application.findMany({
      where: {
        pending_msg_id: null,
      },
    });
    const applicationCount = pendingApplications.length;

    const embedFieldValue = await getApplicationsListString(
      interaction,
      pendingApplications,
    );
    const embedDescription = buildEmbedDescription(
      applicationCount,
      embedFieldValue,
    );

    const replyObj = new MessageSender(
      null,
      {
        title: "Application List",
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
