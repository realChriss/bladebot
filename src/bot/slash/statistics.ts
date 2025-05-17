import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  calculateAgeDistribution,
  calculateTimeStats,
  createTimeRanges,
  generateChart,
} from "../../utils/chartUtils";
import { formatDuration } from "../../utils/applicationStatsUtils";

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("statistics")
    .setDescription("Show application statistics")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days to show statistics for (default: 30)")
        .setRequired(false),
    ) as SlashCommandBuilder,

  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const days = interaction.options.getInteger("days") || 30;
    const { start, end } = createTimeRanges(days);

    const stats = await prisma.application_stats.findMany({
      where: {
        created_at: { gte: start, lte: end },
      },
    });

    if (stats.length === 0) {
      const noStats = new MessageSender(
        null,
        { description: `No application statistics for the last ${days} days.` },
        { state: EMessageReplyState.error },
      ).getEmbed();
      await interaction.editReply({ embeds: [noStats] });
      return;
    }

    // Totals by status
    const totalApplications = stats.length;
    const accepted = stats.filter((s) => s.status === "accepted").length;
    const rejected = stats.filter((s) => s.status === "rejected").length;
    const cancelled = stats.filter((s) => s.status === "cancelled").length;
    const deleted = stats.filter((s) => s.status === "deleted").length;

    // Percentages
    const pct = (n: number) => ((n / totalApplications) * 100).toFixed(0);

    // Ages
    const ageValues = stats.filter((s) => s.age != null).map((s) => s.age!);
    const averageAge =
      ageValues.length > 0
        ? ageValues.reduce((a, b) => a + b, 0) / ageValues.length
        : 0;
    const formattedAverageAge = averageAge.toFixed(0);
    const ageDistribution = calculateAgeDistribution(ageValues);

    // Kills
    const killValues = stats
      .filter((s) => s.kill_count != null)
      .map((s) => s.kill_count!);
    const averageKills =
      killValues.length > 0
        ? killValues.reduce((a, b) => a + b, 0) / killValues.length
        : 0;
    const formattedAverageKills = averageKills.toFixed(0);

    // Wins
    const winValues = stats
      .filter((s) => s.win_count != null)
      .map((s) => s.win_count!);
    const averageWins =
      winValues.length > 0
        ? winValues.reduce((a, b) => a + b, 0) / winValues.length
        : 0;
    const formattedAverageWins = averageWins.toFixed(0);

    // Processing times (ms)
    const procTimes = stats
      .filter((s) => s.processing_time != null && s.status !== "cancelled")
      .map((s) => s.processing_time!);
    const { average, median, min, max } = calculateTimeStats(procTimes);
    const formattedAverage = formatDuration(average);
    const formattedMedian = formatDuration(median);
    const formattedMin = formatDuration(min);
    const formattedMax = formatDuration(max);

    // Charts
    const statusChart = await generateChart({
      type: "pie",
      data: {
        labels: ["Accepted", "Rejected", "Cancelled", "Deleted"],
        datasets: [
          {
            data: [accepted, rejected, cancelled, deleted],
            backgroundColor: ["#00ff00", "#ff0000", "#ffff00", "#a0a0a0"],
          },
        ],
      },
    });
    const ageChart = await generateChart({
      type: "bar",
      data: {
        labels: [...ageDistribution.keys],
        datasets: [
          {
            label: "Age Distribution",
            data: ageDistribution.values,
            backgroundColor: "#3498db",
          },
        ],
      },
    });

    const statusAttachment = new AttachmentBuilder(statusChart, {
      name: "status.png",
    });
    const ageAttachment = new AttachmentBuilder(ageChart, {
      name: "age.png",
    });

    const statsEmbed = new MessageSender(
      null,
      {
        title: `Application Statistics (Last ${days} days)`,
        description: `
Total Applications: **${totalApplications}**
Accepted: **${accepted}** (${pct(accepted)}%)
Rejected: **${rejected}** (${pct(rejected)}%)
Cancelled: **${cancelled}** (${pct(cancelled)}%)
Deleted: **${deleted}** (${pct(deleted)}%)

Average Age: **${formattedAverageAge}**
Average Kills: **${formattedAverageKills}**
Average Wins: **${formattedAverageWins}**

Processing Time:
• Average: **${formattedAverage}**
• Median: **${formattedMedian}**
• Min: **${formattedMin}**
• Max: **${formattedMax}**
        `,
        color: 0xffffff,
      },
      { state: EMessageReplyState.success },
    ).getEmbed();

    const ageEmbed = new MessageSender(
      null,
      {
        title: "Age Distribution",
        image: "attachment://age.png",
        color: 0xffffff,
      },
      { state: EMessageReplyState.success },
    ).getEmbed();

    await interaction.editReply({
      embeds: [statsEmbed, ageEmbed],
      files: [ageAttachment],
    });
  },

  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
    allowEveryone: true,
  },
};

export default command;
