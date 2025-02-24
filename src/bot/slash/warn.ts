import MessageSender from "../classes/MessageSender";
import {
  ChatInputCommandInteraction,
  Client,
  SendableChannels,
  SlashCommandBuilder,
} from "discord.js";
import { EMessageReplyState } from "../types/MsgReplyState";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import Table from "easy-table";

interface WarnConfig {
  warnTypeId: number;
  warnTypeName: string;
  requirementOptionName: string;
  earnedOptionName: string;
  requirementLabel: string;
  earnedLabel: string;
}

interface Warn {
  id: number;
  user_id: string;
  issuer_id: string;
  requirement: number;
  earned: number;
  diff: number | null;
  created_at: Date | string;
  warn_type_id: number;
}

const warnTypeData: Record<
  number,
  {
    label: string;
    requirementLabel: string;
    earnedLabel: string;
    diffLabel: string;
  }
> = {
  1: {
    label: "AP",
    requirementLabel: "AP Requirement",
    earnedLabel: "AP Earned",
    diffLabel: "Diff",
  },
  2: {
    label: "Donation",
    requirementLabel: "Donation Requirement",
    earnedLabel: "Amount Donated",
    diffLabel: "Diff",
  },
};

async function getWarnCounts(userId: string) {
  const warnCounts = await prisma.user_warn.groupBy({
    by: ["warn_type_id"],
    _count: { warn_type_id: true },
    where: { user_id: userId },
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

async function resolveTargetMember(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("target");
  if (!targetUser) return null;
  return interaction.guild?.members.resolve(targetUser.id) ?? null;
}

async function sendDMorFallback(
  member: any,
  dmEmbed: MessageSender,
  fallbackChannel: SendableChannels,
) {
  try {
    const dmChannel = await member.createDM();
    await dmChannel.send({ embeds: [dmEmbed.getEmbed()] });
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

async function createAndNotifyWarn(
  interaction: ChatInputCommandInteraction,
  config: WarnConfig,
) {
  const member = await resolveTargetMember(interaction);
  if (!member) {
    await interaction.reply({
      content: "Member not found",
      ephemeral: true,
    });
    return;
  }

  const requirement = interaction.options.getInteger(
    config.requirementOptionName,
  )!;
  const earned = interaction.options.getInteger(config.earnedOptionName)!;

  if (earned >= requirement) {
    await interaction.reply({
      content: "The earned value must be less than the requirement",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const warn = await prisma.user_warn.create({
    data: {
      user_id: member.id,
      issuer_id: interaction.member?.user.id!,
      requirement: requirement,
      earned: earned,
      warn_type_id: config.warnTypeId,
    },
  });

  const { apWarnCount, donationWarnCount } = await getWarnCounts(member.id);

  const dmEmbed = new MessageSender(
    null,
    {
      authorName: process.env.CLAN_NAME,
      title: "Warned",
      description: `You have been warned for not meeting the ${config.warnTypeName} requirement.\n\n**Warn Information:**\n${config.requirementLabel}: ${requirement}\n${config.earnedLabel}: ${earned}\nWarn ID: ${warn.id}\n\nTotal AP Warns: ${apWarnCount}\nTotal Donation Warns: ${donationWarnCount}`,
      footerText: "Open a ticket for more information",
    },
    { state: EMessageReplyState.error },
  );

  await sendDMorFallback(
    member,
    dmEmbed,
    interaction.channel as SendableChannels,
  );

  const channelEmbed = new MessageSender(
    null,
    {
      authorImg: member.displayAvatarURL(),
      authorName: member.displayName,
      title: `${member.displayName} was warned`,
      description: `**Warn Info:**\nWarn type: ${config.warnTypeName}\n${config.requirementLabel}: ${requirement}\n${config.earnedLabel}: ${earned}\nWarn ID: ${warn.id}\n\nTotal AP Warns: ${apWarnCount}\nTotal Donation Warns: ${donationWarnCount}`,
      footerText: interaction.member?.user.username,
    },
    { state: EMessageReplyState.success },
  );

  await interaction.editReply({ embeds: [channelEmbed.getEmbed()] });
}

async function apWarnExec(interaction: ChatInputCommandInteraction) {
  await createAndNotifyWarn(interaction, {
    warnTypeId: 1,
    warnTypeName: "AP",
    requirementOptionName: "ap-requirement",
    earnedOptionName: "ap-earned",
    requirementLabel: "AP Requirement",
    earnedLabel: "AP Earned",
  });
}

async function donationWarnExec(interaction: ChatInputCommandInteraction) {
  await createAndNotifyWarn(interaction, {
    warnTypeId: 2,
    warnTypeName: "Donation",
    requirementOptionName: "donation-requirement",
    earnedOptionName: "donated",
    requirementLabel: "Donation Requirement",
    earnedLabel: "Amount Donated",
  });
}

async function showWarnExec(interaction: ChatInputCommandInteraction) {
  const member = await resolveTargetMember(interaction);
  if (!member) {
    await interaction.reply({
      content: "Member not found",
      ephemeral: true,
    });
    return;
  }

  const warns = await prisma.user_warn.findMany({
    where: { user_id: member.id },
  });

  const apWarnCount = warns.filter((w) => w.warn_type_id === 1).length;
  const donationWarnCount = warns.filter((w) => w.warn_type_id === 2).length;

  const buildWarnField = (
    warn: Warn,
  ): { name: string; value: string; inline: boolean } => {
    const createdAtTimestamp = Math.floor(
      new Date(warn.created_at).getTime() / 1000,
    );
    const issuer = interaction.guild?.members.cache.get(warn.issuer_id);
    const issuerName = issuer?.user.username || "Unknown";

    const data = warnTypeData[warn.warn_type_id] || warnTypeData[1];

    return {
      name: `__${data.label} Warn #${warn.id}__`,
      value: [
        `**Warn Type:** ${data.label}`,
        `**${data.requirementLabel}:** ${warn.requirement}`,
        `**${data.earnedLabel}:** ${warn.earned}`,
        `**${data.diffLabel}:** ${warn.diff !== null ? warn.diff : "N/A"}`,
        `**Issuer:** ${issuerName}`,
        `**Created At:** <t:${createdAtTimestamp}:f>`,
      ].join("\n"),
      inline: true,
    };
  };

  const fields = warns.map(buildWarnField);

  const description = [
    apWarnCount < 1
      ? "This user has no AP warns."
      : `This user has ${apWarnCount} AP warns.`,
    donationWarnCount < 1
      ? "This user has no Donation warns."
      : `This user has ${donationWarnCount} Donation warns.`,
  ].join("\n");

  const embed = new MessageSender(
    null,
    {
      authorImg: member.displayAvatarURL(),
      authorName: member.displayName,
      title: `Warns of ${member.displayName}`,
      description,
      fields,
      footerText: interaction.member?.user.username,
      color: 0xffffff,
    },
    { state: EMessageReplyState.none },
  );

  await interaction.reply({ embeds: [embed.getEmbed()] });
}

async function warnRemoveExec(interaction: ChatInputCommandInteraction) {
  const warnId = interaction.options.getInteger("warn-id")!;

  await prisma.user_warn
    .delete({ where: { id: warnId } })
    .then((warn) => {
      const member = interaction.guild?.members.cache.get(warn.user_id);
      const embed = new MessageSender(
        null,
        {
          authorImg: member ? member?.displayAvatarURL() : undefined,
          authorName: member?.displayName,
          description: `Warn **#${warnId}** was removed from **${member?.displayName || "Unknown"}**.`,
          footerText: interaction.member?.user.username,
        },
        { state: EMessageReplyState.success },
      ).getEmbed();

      return interaction.reply({ embeds: [embed] });
    })
    .catch(() => {
      const res = new MessageSender(
        null,
        {
          description: `Warn **#${warnId}** was not found.`,
          footerText: interaction.member?.user.username,
        },
        { state: EMessageReplyState.error },
      );
      return interaction.reply({ embeds: [res.getEmbed()] });
    });
}

async function warnListExec(interaction: ChatInputCommandInteraction) {
  const warns = await prisma.user_warn.groupBy({
    by: ["user_id"],
    _count: { id: true },
  });

  const table = new Table();

  warns.forEach((warn) => {
    const user = interaction.guild?.members.cache.get(warn.user_id);
    if (!user || !user.roles.cache.has(process.env.CLAN_ROLE!)) return;

    table.cell("Username", user.displayName.replace(/`/g, "\\`"));
    table.cell("Warns", warn._count.id);
    table.newRow();
  });

  table.sort(["Warns|des"]);

  const embedDescription =
    table.columns().length > 0
      ? `\`\`\`\n${table.toString()}\n\`\`\`\n_Only members with the Clan role are displayed_`
      : "No warns found";

  const embed = new MessageSender(
    null,
    {
      title: "Warn list",
      description: embedDescription,
      footerText: interaction.member?.user.username,
      color: 0xffffff,
    },
    { state: EMessageReplyState.none },
  );

  await interaction.reply({ embeds: [embed.getEmbed()] });
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ap")
        .setDescription("AP warn")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("The member to warn")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("ap-requirement")
            .setDescription("The current AP requirement")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("ap-earned")
            .setDescription("The AP the user earned")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("donation")
        .setDescription("Donation warn")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("The member to warn")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("donation-requirement")
            .setDescription("The current Donation requirement")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("donated")
            .setDescription("The amount the user has donated")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("show")
        .setDescription("Shows the warns of a member")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("The member to lookup")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Removes a warn")
        .addIntegerOption((option) =>
          option
            .setName("warn-id")
            .setDescription("The ID of the warn")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all warn"),
    ) as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    switch (interaction.options.getSubcommand()) {
      case "ap":
        await apWarnExec(interaction);
        break;
      case "donation":
        await donationWarnExec(interaction);
        break;
      case "show":
        await showWarnExec(interaction);
        break;
      case "remove":
        await warnRemoveExec(interaction);
        break;
      case "list":
        await warnListExec(interaction);
        break;
    }
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};

export default command;
