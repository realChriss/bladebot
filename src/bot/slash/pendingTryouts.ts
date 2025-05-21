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
import { env } from "../../env";

async function fetchApplicationMessage(
  msgId: string,
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const channel = interaction.guild?.channels.cache.get(
    env.APPLICATION_CHANNEL,
  );
  if (!channel || !channel.isTextBased()) {
    return null;
  }

  return await channel.messages.fetch(msgId).catch(() => null);
}

async function getTryoutsListString(
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

        const hasTryoutRole = discordUser.roles.cache.has(
          env.TRYOUT_PENDING_ROLE!,
        );
        if (!hasTryoutRole) {
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

function buildEmbedDescription(tryoutCount: number, listString: string) {
  if (tryoutCount > 0) {
    return `There ${tryoutCount !== 1 ? "are" : "is"} ${tryoutCount} pending tryouts\n\n**Pending Tryouts**\n${listString}`;
  }

  return `There are no pending tryouts`;
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("list-tryouts")
    .setDescription("Shows all pending tryouts"),
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    const pendingApplications = await prisma.application.findMany({
      where: {
        pending_msg_id: null,
      },
    });

    const embedFieldValue = await getTryoutsListString(
      interaction,
      pendingApplications,
    );

    const tryoutCount = embedFieldValue
      ? embedFieldValue.split("\n").filter((line) => line.trim()).length
      : 0;

    const embedDescription = buildEmbedDescription(
      tryoutCount,
      embedFieldValue,
    );

    const replyObj = new MessageSender(
      null,
      {
        title: "Tryout List",
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
