import ClientEvent from "../classes/ClientEvent";
import { Events, Interaction, EmbedBuilder, TextChannel, SendableChannels } from "discord.js";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  getAppliedMember,
  getApplication,
} from "../../utils/applicationActionUtils";

type Regions = Record<string, { name: string; tryouterRoleId: string }>;

const regions: Regions = {
  [process.env.EU_REGION_ROLE!]: {
    name: "Europe",
    tryouterRoleId: process.env.EU_TRYOUTER_ROLE!,
  },
  [process.env.NA_REGION_ROLE!]: {
    name: "North America",
    tryouterRoleId: process.env.NA_TRYOUTER_ROLE!,
  },
  [process.env.SA_REGION_ROLE!]: {
    name: "South America",
    tryouterRoleId: process.env.SA_TRYOUTER_ROLE!,
  },
  [process.env.ASIA_REGION_ROLE!]: {
    name: "Asia",
    tryouterRoleId: process.env.ASIA_TRYOUTER_ROLE!,
  },
  [process.env.AU_REGION_ROLE!]: {
    name: "Australia",
    tryouterRoleId: process.env.AU_TRYOUTER_ROLE!,
  },
};

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "application_demand_tryout"
    ) {
      return;
    }

    await interaction.deferReply();

    const application = await getApplication(interaction);
    if (!application) {
      return;
    }

    const appliedMember = await getAppliedMember(interaction, application);
    if (!appliedMember) {
      return;
    }

    if (appliedMember.roles.cache.has(process.env.TRYOUT_PENDING_ROLE!)) {
      const alreadyInQueueEmbed = new MessageSender(
        null,
        {
          authorImg: appliedMember.displayAvatarURL(),
          authorName: appliedMember.displayName,
          description: `❌ **${appliedMember.user.username}** is already in the tryout queue.`,
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error }
      ).getEmbed();
      
      await interaction.editReply({
        embeds: [alreadyInQueueEmbed],
      });
      return;
    }

    let userRegion = null;
    
    for (const regionRoleId in regions) {
      if (appliedMember.roles.cache.has(regionRoleId)) {
        userRegion = regions[regionRoleId];
        break;
      }
    }

    if (!userRegion) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: `Could not determine ${appliedMember.user.username}'s region. Please make sure they have a region role.`,
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error }
      ).getEmbed();
      
      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const tryoutChannel = interaction.client.channels.cache.get(
      process.env.TRYOUT_CHANNEL!
    );

    if (!tryoutChannel || !tryoutChannel.isSendable()) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: `Could not find the tryout channel.`,
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error }
      ).getEmbed();
      
      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const tryoutEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: appliedMember.displayName,
        iconURL: appliedMember.displayAvatarURL(),
      })
      .setTitle("Tryout Request")
      .setDescription(`**${appliedMember.user.username}** needs to be tried out.\n\n**Tryout Information:**\n• 1v1 against a tryouter\n• Long distance\n• Best of 5\n• No abilities (equip pulse <:Pulse:1357283254100688947>)\n\nThe purpose of this tryout is to assess your skill level and gameplay understanding. Winning is not required.`)
      .addFields(
        { name: "Region", value: userRegion.name, inline: true },
        { name: "Requested by", value: interaction.user.displayName, inline: true }
      )
      .setThumbnail(application.roblox_headshot_url)
      .setTimestamp();

    await appliedMember.roles.add(process.env.TRYOUT_PENDING_ROLE!);

    await tryoutChannel.send({
      content: `${appliedMember.toString()} <@&${userRegion.tryouterRoleId}>`,
      embeds: [tryoutEmbed],
    });

    const successEmbed = new MessageSender(
      null,
      {
        authorImg: appliedMember.displayAvatarURL(),
        authorName: appliedMember.displayName,
        description: `⚔️ Added **${appliedMember.user.username}** to tryout queue.\nRegion: **${userRegion.name}**`,
        footerText: interaction.user.username,
      },
      { state: EMessageReplyState.success }
    ).getEmbed();

    await interaction.editReply({
      embeds: [successEmbed],
    });
  },
};

export default event;
