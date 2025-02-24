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

async function getWarnCount(userId: string) {
  const warnCounts = await prisma.user_warn.groupBy({
    by: ["warn_type_id"],
    _count: { warn_type_id: true },
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

  const apWarnCount = counts[1] ?? 0;
  const donationWarnCount = counts[2] ?? 0;

  return {
    apWarnCount,
    donationWarnCount,
  };
}

async function apWarnExec(interaction: ChatInputCommandInteraction) {
  const member = interaction.guild?.members.resolve(
    interaction.options.getUser("target")!.id,
  );
  const apRequirement = interaction.options.getInteger("ap-requirement")!;
  const apEarned = interaction.options.getInteger("ap-earned")!;

  if (!member) {
    await interaction.reply({
      content: "Member not found",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const warn = await prisma.user_warn.create({
    data: {
      user_id: member.id,
      issuer_id: interaction.member?.user.id!,
      requirement: apRequirement,
      earned: apEarned,
      warn_type_id: 1,
    },
  });

  const { apWarnCount, donationWarnCount } = await getWarnCount(member.id);

  const warnEmbed = new MessageSender(
    null,
    {
      authorName: process.env.CLAN_NAME,
      title: "Warned",
      description: `You have been warned for not meeting the AP requirement.\n\n**Warn Information:**\nAP Requirement: ${apRequirement}\nAP Earned: ${apEarned}\nWarn ID: ${warn.id}\n\nTotal AP Warns: ${apWarnCount}\nTotal Donation Warns: ${donationWarnCount}`,
      footerText: "Open a ticket for more information",
    },
    {
      state: EMessageReplyState.error,
    },
  );

  await member.createDM().catch(() => null);
  await member.dmChannel
    ?.send({ embeds: [warnEmbed.getEmbed()] })
    .catch(async () => {
      await new MessageSender(
        interaction.channel as SendableChannels,
        {
          title: "DM Failure",
          description: `Could not send a DM to **${member.displayName}**.\nPlease contact the user about the warn`,
        },
        {
          state: EMessageReplyState.error,
        },
      ).sendMessage();
    });

  const res = new MessageSender(
    null,
    {
      title: `${member.displayName} was warned`,
      description: `**Warn Info:**\nWarn type: AP\nAP Requirement: ${apRequirement}\nAP Earned: ${apEarned}\nWarn ID: ${warn.id}\n\nTotal AP Warns: ${apWarnCount}\nTotal Donation Warns: ${donationWarnCount}`,
      footerText: interaction.member?.user.username,
    },
    {
      state: EMessageReplyState.success,
    },
  );

  await interaction.editReply({
    embeds: [res.getEmbed()],
  });
}

async function donationWarnExec(interaction: ChatInputCommandInteraction) {
  const member = interaction.guild?.members.resolve(
    interaction.options.getUser("target")!.id,
  );
  const donationRequirement = interaction.options.getInteger(
    "donation-requirement",
  )!;
  const donated = interaction.options.getInteger("donated")!;

  if (!member) {
    await interaction.reply({
      content: "Member not found",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const warn = await prisma.user_warn.create({
    data: {
      user_id: member.id,
      issuer_id: interaction.member?.user.id!,
      requirement: donationRequirement,
      earned: donated,
      warn_type_id: 2,
    },
  });

  const { apWarnCount, donationWarnCount } = await getWarnCount(member.id);

  const warnEmbed = new MessageSender(
    null,
    {
      authorName: process.env.CLAN_NAME,
      title: "Warned",
      description: `You have been warned for not meeting the Donation requirement.\n\n**Warn Information:**\nDonation Requirement: ${donationRequirement}\nAmount Donated: ${donated}\nWarn ID: ${warn.id}\n\nTotal AP Warns: ${apWarnCount}\nTotal Donation Warns: ${donationWarnCount}`,
      footerText: "Open a ticket for more information",
    },
    {
      state: EMessageReplyState.error,
    },
  );

  await member.createDM().catch(() => null);
  await member.dmChannel
    ?.send({ embeds: [warnEmbed.getEmbed()] })
    .catch(async () => {
      await new MessageSender(
        interaction.channel as SendableChannels,
        {
          title: "DM Failure",
          description: `Could not send a DM to **${member.displayName}**.\nPlease contact the user about the warn`,
        },
        {
          state: EMessageReplyState.error,
        },
      ).sendMessage();
    });

  const res = new MessageSender(
    null,
    {
      title: `${member.displayName} was warned`,
      description: `**Warn Info:**\nWarn type: Donation\nDonation Requirement: ${donationRequirement}\nAmount Donated: ${donated}\nWarn ID: ${warn.id}\n\nTotal AP Warns: ${apWarnCount}\nTotal Donation Warns: ${donationWarnCount}`,
      footerText: interaction.member?.user.username,
    },
    {
      state: EMessageReplyState.success,
    },
  );

  await interaction.editReply({
    embeds: [res.getEmbed()],
  });
}

async function showWarnExec(interaction: ChatInputCommandInteraction) {
  const member = interaction.guild?.members.resolve(
    interaction.options.getUser("target")!.id,
  );

  if (!member) {
    await interaction.reply({
      content: "Member not found",
      ephemeral: true,
    });
    return;
  }

  const warns = await prisma.user_warn.findMany({
    where: {
      user_id: member.id,
    },
  });

  const apWarnCount = warns.filter((x) => x.warn_type_id === 1).length;
  const donationWarnCount = warns.filter((x) => x.warn_type_id === 2).length;

  const fields =
    warns.map((warn) => {
      const createdAtTimestamp = Math.floor(
        new Date(warn.created_at).getTime() / 1000,
      );
      const issuer = interaction.guild?.members.cache.get(warn.issuer_id);

      if (warn.warn_type_id === 1) {
        return {
          name: `__AP Warn #${warn.id}__`,
          value:
            `**Warn Type:** AP\n` +
            `**AP Requirement:** ${warn.requirement}\n` +
            `**AP Earned:** ${warn.earned}\n` +
            `**AP Diff:** ${warn.diff}\n` +
            `**Issuer:** ${issuer?.user.username || "Unknown"}\n` +
            `**Created At:** <t:${createdAtTimestamp}:f>`,
          inline: true,
        };
      } else {
        return {
          name: `__Donation Warn #${warn.id}__`,
          value:
            `**Warn Type:** Donation\n` +
            `**Donation Requirement:** ${warn.requirement}\n` +
            `**Amount Donated:** ${warn.earned}\n` +
            `**Diff:** ${warn.diff}\n` +
            `**Issuer:** ${issuer?.user.username || "Unknown"}\n` +
            `**Created At:** <t:${createdAtTimestamp}:f>`,
          inline: true,
        };
      }
    }) || undefined;

  const res = new MessageSender(
    null,
    {
      title: `Warns of ${member.displayName}`,
      description:
        (apWarnCount < 1
          ? "This user has no AP warns."
          : `This user has ${apWarnCount} AP warns.`) +
        "\n" +
        (donationWarnCount < 1
          ? "This user has no Donation warns."
          : `This user has ${donationWarnCount} Donation warns.`),
      fields: fields,
      footerText: interaction.member?.user.username,
      color: 0xffffff,
    },
    {
      state: EMessageReplyState.none,
    },
  );

  await interaction.reply({
    embeds: [res.getEmbed()],
  });
}

async function warnRemoveExec(interaction: ChatInputCommandInteraction) {
  const warnId = interaction.options.getInteger("warn-id")!;

  let res: MessageSender;

  await prisma.user_warn
    .delete({
      where: {
        id: warnId,
      },
    })
    .then(async (warn) => {
      const member = interaction.guild?.members.cache.get(warn.user_id);

      res = new MessageSender(
        null,
        {
          description: `Warn **#${warnId}** was removed from **${member?.displayName || "Unknown"}**.`,
          footerText: interaction.member?.user.username,
        },
        {
          state: EMessageReplyState.success,
        },
      );

      await interaction.reply({
        embeds: [res.getEmbed()],
      });
    })
    .catch(async () => {
      res = new MessageSender(
        null,
        {
          description: `Warn **#${warnId}** was not found.`,
          footerText: interaction.member?.user.username,
        },
        {
          state: EMessageReplyState.error,
        },
      );

      await interaction.reply({
        embeds: [res.getEmbed()],
      });
    });
}

async function warnListExec(interaction: ChatInputCommandInteraction) {
  const warns = await prisma.user_warn.groupBy({
    by: ["user_id"],
    _count: {
      id: true,
    },
  });

  const table = new Table();

  warns.forEach((warn) => {
    const user = interaction.guild?.members.cache.get(warn.user_id);
    if (!user || user?.roles.cache.has(process.env.CLAN_ROLE!) === false) {
      return null;
    }

    table.cell("Username", user.displayName.replace(/`/g, "\\`"));
    table.cell("Warns", warn._count.id);
    table.newRow();
  });

  table.sort(["Warns|des"]);

  const warnLength = table.columns().length;

  const embedDescription =
    warnLength > 0
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
    {
      state: EMessageReplyState.none,
    },
  );

  await interaction.reply({
    embeds: [embed.getEmbed()],
  });
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
    if (interaction.options.getSubcommand() === "ap") {
      await apWarnExec(interaction);
    } else if (interaction.options.getSubcommand() === "donation") {
      await donationWarnExec(interaction);
    } else if (interaction.options.getSubcommand() === "show") {
      await showWarnExec(interaction);
    } else if (interaction.options.getSubcommand() === "remove") {
      await warnRemoveExec(interaction);
    } else if (interaction.options.getSubcommand() === "list") {
      await warnListExec(interaction);
    }
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};
export default command;
