import { ChatInputCommandInteraction, GuildMember, SendableChannels } from "discord.js";
import prisma from "../db/prisma";
import MessageSender, { EMessageReplyState } from "../bot/classes/MessageSender";

export async function getWarnCounts(userId: string) {
  const warnCounts = await prisma.user_warn.groupBy({
    by: ["warn_type_id"],
    _count: {
      warn_type_id: true,
    },
    where: {
      user_id: userId,
    },
  });

  const counts = warnCounts.reduce(
    (acc, curr) => {
      acc[curr.warn_type_id] = curr._count.warn_type_id;
      return acc;
    },
    {} as Record<number, number>,
  );

  return {
    apWarnCount: counts[1] ?? 0,
    donationWarnCount: counts[2] ?? 0,
  };
}

export async function resolveTargetMember(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("target");
  if (!targetUser) return null;
  return interaction.guild?.members.resolve(targetUser.id) ?? null;
}

export async function sendDMorFallback(
  member: GuildMember,
  dmEmbed: MessageSender,
  fallbackChannel: SendableChannels,
) {
  try {
    const dmChannel = await member.createDM();
    await dmChannel.send({
      embeds: [dmEmbed.getEmbed()],
    });
  } catch (error) {
    const fallback = new MessageSender(
      fallbackChannel,
      {
        title: "DM Failure",
        description: `Could not send a DM to **${member.displayName}**.\nPlease contact the user about the warn.`,
      },
      { state: EMessageReplyState.error },
    );
    await fallback.sendMessage();
  }
}