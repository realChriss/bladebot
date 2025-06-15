import {
  ButtonInteraction,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";
import { application } from "@prisma/client";
import Logger from "./Logger";
import prisma from "../db/prisma";
import { env } from "../env";

export type RegionInfo = { name: string; tryouterRoleId: string };
export type Regions = Record<string, RegionInfo>;

const regions: Regions = {
  [env.EU_REGION_ROLE!]: {
    name: "Europe",
    tryouterRoleId: env.EU_TRYOUTER_ROLE!,
  },
  [env.NA_REGION_ROLE!]: {
    name: "North America",
    tryouterRoleId: env.NA_TRYOUTER_ROLE!,
  },
  [env.SA_REGION_ROLE!]: {
    name: "South America",
    tryouterRoleId: env.SA_TRYOUTER_ROLE!,
  },
  [env.ASIA_REGION_ROLE!]: {
    name: "Asia",
    tryouterRoleId: env.ASIA_TRYOUTER_ROLE!,
  },
  [env.AU_REGION_ROLE!]: {
    name: "Australia",
    tryouterRoleId: env.AU_TRYOUTER_ROLE!,
  },
};

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
): Promise<boolean> {
  let success = true;

  await member.createDM().catch(() => null);
  await member.dmChannel
    ?.send({
      embeds: [embed],
    })
    .catch(async () => {
      await fallback();
      success = false;
    });
  return success;
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

export function getRegionFromRoles(
  roles: GuildMemberRoleManager,
): RegionInfo | null {
  for (const regionRoleId in regions) {
    if (roles.cache.has(regionRoleId)) {
      return regions[regionRoleId];
    }
  }
  return null;
}
