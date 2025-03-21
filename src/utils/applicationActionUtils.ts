import { ButtonInteraction, GuildMember } from "discord.js";
import { application } from "@prisma/client";
import Logger from "./Logger";
import prisma from "../db/prisma";

export async function getApplication(
  interaction: ButtonInteraction,
): Promise<application | null> {
  const application = await prisma.application.findFirst({
    where: { msg_id: interaction.message.id },
  });
  if (!application) {
    await interaction.editReply({
      content: "This application does not exist in database",
    });
    return null;
  }
  return application;
}

export async function sendDMWithFallback(
  member: GuildMember,
  embed: TMessageEmbed,
  fallback: () => Promise<void>,
) {
  await member.createDM().catch(() => null);
  await member.dmChannel
    ?.send({
      embeds: [embed],
    })
    .catch(async () => {
      await fallback();
    });
}

export async function updateOriginalEmbed(
  interaction: ButtonInteraction,
  footerText: string,
  color: number,
) {
  const originalEmbed = interaction.message.embeds[0];
  if (!originalEmbed) {
    Logger.error("Original embed not found");
    return;
  }

  await interaction.message.edit({
    embeds: [
      {
        ...originalEmbed.data,
        footer: {
          text: footerText,
        },
        color,
      },
    ],
    components: [],
  });
}

export async function getAppliedMember(
  interaction: ButtonInteraction,
  application: application,
): Promise<GuildMember | null> {
  const member = interaction.guild?.members.cache.get(application.user_id);
  if (!member) {
    await interaction.editReply("This user is not in the server");
    return null;
  }
  return member;
}
