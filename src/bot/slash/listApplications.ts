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
import Emoji from "../assets/emoji";
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

        const waitlisted = discordUser.roles.cache.has(env.WAITLIST_ROLE!);
        const invitePending = x.pending_msg_id !== null;
        const tryoutPending = discordUser.roles.cache.has(
          env.TRYOUT_PENDING_ROLE!,
        );

        return {
          username: discordUser.displayName,
          url: message ? `[Jump](${message.url})` : "_Url Not Found_",
          timestamp: message
            ? `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`
            : "_No Time_",
          createdTimestamp: message?.createdTimestamp || 0,
          waitlisted: waitlisted,
          tryoutPending: tryoutPending,
          invitePending: invitePending,
        };
      }),
    )
  )
    .filter((x) => x !== null)
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .map(
      (data) =>
        `${data.username} — ${data.timestamp} — ${data.url} ${data.invitePending ? Emoji.invite : ""} ${data.waitlisted ? Emoji.waitlist : ""} ${data.tryoutPending ? Emoji.tryout : ""}`,
    )
    .join("\n");
}

function buildEmbedDescription(applicationCount: number, listString: string) {
  if (applicationCount > 0) {
    return `There ${applicationCount !== 1 ? "are" : "is"} ${applicationCount} pending applications\n\n**Pending Applications**\n${listString}\n\n[${Emoji.invite}] *Invite Pending*\n[${Emoji.waitlist}] *Waitlisted user*\n[${Emoji.tryout}] *Tryout pending*`;
  }

  return `There are no pending applications`;
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
    allowEveryone: true,
    cooldown: 20,
  },
};

export default command;
