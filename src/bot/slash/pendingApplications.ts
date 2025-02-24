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

    const getEmbedFieldValue = async () => {
      return (
        await Promise.all(
          pendingApplications.map(async (x) => {
            const message = await fetchApplicationMessage(
              x.msg_id,
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
    const embedDescription = `There are ${applicationCount > 0 ? applicationCount : "no"} pending applications\n\n**Pending Applications**\n${embedFieldValue}`;

    const replyObj = new MessageSender(
      null,
      {
        title: "Application List",
        description: embedDescription,
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
