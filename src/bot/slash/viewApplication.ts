import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";

function getAvatar(member: any, size: number) {
  return member.user.displayAvatarURL({
    size: size,
    format: "webp",
  });
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("view-application")
    .setDescription("View a specific application")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose application you want to view")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("message-id")
        .setDescription("The message ID of the application")
        .setRequired(false),
    ) as SlashCommandBuilder,
  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser("user");
    const messageId = interaction.options.getString("message-id");

    if (!user && !messageId) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: "You must provide either a user or a message ID",
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.reply({
        embeds: [errorEmbed],
      });
      return;
    }

    const member = interaction.guild?.members.cache.get(user?.id!);
    if (!member) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: "Could not find this user in the server",
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.reply({
        embeds: [errorEmbed],
      });
      return;
    }

    const application = await prisma.application.findFirst({
      where: user ? { user_id: user.id } : { msg_id: messageId! },
    });

    if (!application) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: user
            ? `No application found for ${member.displayName}`
            : "No application found with that message ID",
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.reply({
        embeds: [errorEmbed],
      });
      return;
    }

    const applicationEmbed = new MessageSender(
      null,
      {
        authorName: member.displayName,
        authorImg: getAvatar(member, 128),
        title: "Application Details",
        fields: [
          {
            name: "Roblox User",
            value: application.roblox_user || "Not provided",
            inline: true,
          },
          {
            name: "Age",
            value: application.age?.toString() || "Not provided",
            inline: true,
          },
          {
            name: "Kills",
            value: application.kill?.toString() || "Not provided",
            inline: true,
          },
          {
            name: "Wins",
            value: application.win?.toString() || "Not provided",
            inline: true,
          },
          {
            name: "Status",
            value: application.pending_msg_id ? "Pending Invite" : "Processing",
            inline: true,
          },
          {
            name: "Created At",
            value: `<t:${Math.floor(application.created_at.getTime() / 1000)}:R>`,
            inline: true,
          },
        ],
        image: application.roblox_avatar_url || undefined,
        footerText: interaction.user.username,
        color: 0xffffff,
      },
      { state: EMessageReplyState.none },
    ).getEmbed();

    await interaction.reply({
      embeds: [applicationEmbed],
    });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowStaff: true,
  },
};

export default command;
