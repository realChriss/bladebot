import {
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import { env } from "../../env";
import { buildMessageUrl } from "../../utils/stringUtils";
import { getRegionFromRoles } from "../../utils/applicationActionUtils";
import { application } from "@prisma/client";
import Emoji from "../assets/emoji";

function getAvatar(member: any, size: number) {
  return member.user.displayAvatarURL({
    size: size,
    format: "webp",
  });
}

function buildDescription(
  application: application,
  member: GuildMember,
): string {
  const region = getRegionFromRoles(member.roles);
  let status: string | null = null;

  if (member.roles.cache.has(env.WAITLIST_ROLE!)) {
    status = `Waitlisted ${Emoji.waitlist}`;
  } else if (member.roles.cache.has(env.TRYOUT_PENDING_ROLE!)) {
    status = `Tryout Pending ${application.tryout_msg_id ? `[[Jump]](${buildMessageUrl(env.TRYOUT_CHANNEL!, application.tryout_msg_id)})` : ""} ${Emoji.tryout}`;
  } else if (application.pending_msg_id) {
    status = `Pending Invite ${application.pending_msg_id ? `[[Jump]](${buildMessageUrl(env.PENDING_INV_CHANNEL, application.pending_msg_id)})` : ""} ${Emoji.invite}`;
  } else {
    status = "Processing";
  }

  let description: string = "";
  description += `**Roblox User:** ${application.roblox_user || "Not provided"}\n`;
  description += `**Age:** ${application.age || "Not provided"}\n`;
  description += `**Kills:** ${application.kill || "Not provided"}\n`;
  description += `**Wins:** ${application.win || "Not provided"}\n`;
  description += `**Device:** ${application.device || "Not provided"}\n`;
  description += `**Region:** ${region?.name || "Not found"}\n`;
  description += `**Status:** ${status}\n`;
  description += `**App. Message:** [[Jump]](${buildMessageUrl(env.APPLICATION_CHANNEL, application.msg_id)})\n`;
  description += `**Created At:** <t:${Math.floor(application.created_at.getTime() / 1000)}:R>\n`;

  return description;
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

    const application = await prisma.application.findFirst({
      where: user ? { user_id: user.id } : { msg_id: messageId! },
    });

    const member = interaction.guild?.members.cache.get(application?.user_id!);
    if (!member) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: "Could not find this user in the server.",
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.reply({
        embeds: [errorEmbed],
      });
      return;
    }

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
        description: buildDescription(application, member),
        image: application.roblox_avatar_url || undefined,
        thumbnail: application.roblox_headshot_url || undefined,
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
