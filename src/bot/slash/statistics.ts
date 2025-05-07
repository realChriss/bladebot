import { ApplicationCommandOptionType, AttachmentBuilder, ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import ClientSlash from '../classes/ClientSlash';
import prisma from '../../db/prisma';
import MessageSender, { EMessageReplyState } from '../classes/MessageSender';
import { calculateAgeDistribution, calculateProcessingTimeStats, createTimeRanges, generateChart } from '../../utils/chartUtils';

interface ApplicationStats {
  status: string;
  age: number | null;
  processing_time: number | null;
}

const slashData = new SlashCommandBuilder()
  .setName('statistics')
  .setDescription('Show application statistics')
  .addIntegerOption(option =>
    option
      .setName('days')
      .setDescription('Number of days to show statistics for (default: 30)')
      .setRequired(false)
  ) as SlashCommandBuilder;

async function executeCommand(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const days = interaction.options.getInteger('days') || 30;
  const { start, end } = createTimeRanges(days);

  const stats = await prisma.application_stats.findMany({
    where: {
      created_at: {
        gte: start,
        lte: end
      }
    }
  });

  if (stats.length === 0) {
    await interaction.editReply({
      embeds: [
        new MessageSender(
          null,
          {
            description: `No application statistics found for the last ${days} days.`
          },
          { state: EMessageReplyState.error }
        ).getEmbed()
      ]
    });
    return;
  }

  // Calculate statistics
  const totalApplications = stats.length;
  const accepted = stats.filter((s) => s.status === 'accepted').length;
  const rejected = stats.filter((s) => s.status === 'rejected').length;
  const cancelled = stats.filter((s) => s.status === 'cancelled').length;
  const deleted = stats.filter((s) => s.status === 'deleted').length;
  
  const ageDistribution = calculateAgeDistribution(
    stats.filter((s) => s.age != null).map(s => s.age!)
  );
  const processingTimes = stats
    .filter((s) => s.processing_time != null)
    .map(s => s.processing_time!);
  const timeStats = calculateProcessingTimeStats(processingTimes);

  // Generate status distribution chart
  const statusChart = await generateChart({
    type: 'pie',
    data: {
      labels: ['Accepted', 'Rejected', 'Cancelled', 'Deleted'],
      datasets: [{
        data: [accepted, rejected, cancelled, deleted],
        backgroundColor: ['#00ff00', '#ff0000', '#ffff00', '#a0a0a0']
      }]
    }
  });

  // Generate age distribution chart
  const ageChart = await generateChart({
    type: 'bar',
    data: {
      labels: Object.keys(ageDistribution),
      datasets: [{
        label: 'Age Distribution',
        data: Object.values(ageDistribution),
        backgroundColor: '#3498db'
      }]
    }
  });

  const statusAttachment = new AttachmentBuilder(statusChart, { name: 'status.png' });
  const ageAttachment = new AttachmentBuilder(ageChart, { name: 'age.png' });

  const embed = new MessageSender(
    null,
    {
      title: `Application Statistics (Last ${days} days)`,
      description: `
Total Applications: **${totalApplications}**
Accepted: **${accepted}** (${((accepted/totalApplications)*100).toFixed(1)}%)
Rejected: **${rejected}** (${((rejected/totalApplications)*100).toFixed(1)}%)
Cancelled: **${cancelled}** (${((cancelled/totalApplications)*100).toFixed(1)}%)
Deleted: **${deleted}** (${((deleted/totalApplications)*100).toFixed(1)}%)`,
      image: 'attachment://status.png',
      footerText: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    },
    { state: EMessageReplyState.success }
  ).getEmbed();

  const ageEmbed = new MessageSender(
    null,
    {
      title: 'Age Distribution',
      image: 'attachment://age.png'
    },
    { state: EMessageReplyState.success }
  ).getEmbed();

  await interaction.editReply({
    embeds: [embed, ageEmbed],
    files: [statusAttachment, ageAttachment]
  });
}

export default new ClientSlash(
  executeCommand,
  slashData,
  { 
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
    allowEveryone: true
  },
  'Show detailed application statistics including acceptance rates and demographics'
);