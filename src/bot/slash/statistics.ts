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
import { application_stats } from "@prisma/client";

async function getStatRows(days: number | null): Promise<application_stats[]> {
  if (!days) {
    return await prisma.application_stats.findMany();
  }

  const { start, end } = createTimeRanges(days);
  return await prisma.application_stats.findMany({
    where: { created_at: { gte: start, lte: end } },
  });
}

function countByStatus(
  stats: application_stats[],
  statuses: string[],
): Record<string, number> {
  return stats.reduce(
    (acc, s) => {
      const key = s.status;
      if (statuses.includes(key)) {
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
}

function extractValues(
  stats: application_stats[],
  field: keyof application_stats,
): number[] {
  return stats.map((s) => s[field]).filter((v) => typeof v === "number");
}

function computeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const STATUSES = ["accepted", "rejected", "cancelled", "deleted"];

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("statistics")
    .setDescription("Show application statistics")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days to show statistics (default: all)")
        .setRequired(false)
        .setMaxValue(3650),
    ) as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const days = interaction.options.getInteger("days");
    const stats = await getStatRows(days);

    if (stats.length === 0) {
      const noStats = new MessageSender(
        null,
        { description: `No application statistics found` },
        { state: EMessageReplyState.error },
      ).getEmbed();
      await interaction.editReply({ embeds: [noStats] });
      return;
    }

    const totalApplications = stats.length;
    const statusCounts = countByStatus(stats, STATUSES);
    const getCount = (status: string) => statusCounts[status] || 0;
    const accepted = getCount("accepted");
    const rejected = getCount("rejected");
    const cancelled = getCount("cancelled");
    const deleted = getCount("deleted");

    const pct = (n: number) => ((n / totalApplications) * 100).toFixed(0);

    const ageVals = extractValues(stats, "age");
    const averageAge = computeAverage(ageVals).toFixed(0);
    const ageDistribution = calculateAgeDistribution(ageVals);

    const killVals = extractValues(stats, "kill_count");
    const averageKills = computeAverage(killVals).toFixed(0);

    const winVals = extractValues(stats, "win_count");
    const averageWins = computeAverage(winVals).toFixed(0);

    const procVals = stats
      .filter(
        (s) =>
          s.processing_time != null &&
          !["cancelled", "deleted"].includes(s.status),
      )
      .map((s) => s.processing_time!);
    const { average, median, min, max } = calculateTimeStats(procVals);
    const formattedAverage = formatDuration(average);
    const formattedMedian = formatDuration(median);
    const formattedMin = formatDuration(min);
    const formattedMax = formatDuration(max);

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
        title: `Application Statistics ${days ? `(Last ${days} days)` : "(All Time)"}`,
        description: `
Total Applications: **${totalApplications}**
Accepted: **${accepted}** (${pct(accepted)}%)
Rejected: **${rejected}** (${pct(rejected)}%)
Cancelled: **${cancelled}** (${pct(cancelled)}%)
Deleted: **${deleted}** (${pct(deleted)}%)

Average Age: **${averageAge}**
Average Kills: **${averageKills}**
Average Wins: **${averageWins}**

Processing Time:
• Average: **${formattedAverage}**
• Median: **${formattedMedian}**
• Min: **${formattedMin}**
• Max: **${formattedMax}**
        `,
        footerText: interaction.user.username,
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
    onlyBotChannel: true,
    allowEveryone: true,
  },
};

export default command;
