import ClientEvent from "../classes/ClientEvent";
import {
  ButtonInteraction,
  Events,
  GuildMember,
  SendableChannels,
  Interaction,
} from "discord.js";
import prisma from "../../db/prisma";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";
import Logger from "../../utils/Logger";
import { TMessageReplyPayload } from "../types/MsgReplyPayload";
import ConfigManager from "../../utils/ConfigManager";
import { application } from "@prisma/client";

const components = [
  {
    type: 1,
    components: [
      {
        type: 2,
        label: "Done",
        style: 1,
        custom_id: "clan_invite_sent",
      },
    ],
  },
];

async function getApplication(interaction: ButtonInteraction) {
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

async function sendDMWithFallback(
  member: GuildMember,
  embed: ReturnType<MessageSender["getEmbed"]>,
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

async function updateOriginalEmbed(
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

async function getAppliedMember(
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

async function sendPendingInvite(
  interaction: ButtonInteraction,
  application: application,
  appliedMember: GuildMember,
) {
  const invChannel = interaction.guild?.channels.cache.get(
    process.env.PENDING_INV_CHANNEL!,
  );
  if (!invChannel || !invChannel.isSendable()) {
    Logger.error("Invite channel not found");
    return;
  }

  const inviteMsg = new MessageSender(
    invChannel,
    {
      title: "Pending Invite",
      description: `Roblox Username: \`${application.roblox_user}\`\n\nDiscord User: \`${appliedMember.user.username}\`\nDiscord Ping: ${appliedMember.toString()}`,
      thumbnail: application.roblox_headshot_url || undefined,
      footerText: "Press the button, after the user was invited to the clan",
      color: 0xffffff,
    },
    { state: EMessageReplyState.none },
  );

  const pendingMsg = await invChannel.send({
    content: interaction.member?.toString(),
    embeds: [inviteMsg.getEmbed()],
    components,
  });

  await prisma.application.update({
    where: {
      user_id_msg_id: {
        user_id: application.user_id,
        msg_id: application.msg_id,
      },
    },
    data: {
      pending_msg_id: pendingMsg.id,
    },
  });
}

async function updateNickname(
  interaction: ButtonInteraction,
  appliedMember: GuildMember,
  application: application,
) {
  const displayName = appliedMember.displayName;
  const nickname = `${appliedMember.user.globalName || appliedMember.user.username} (${application.roblox_user})`;

  if (nickname.length <= 32) {
    await appliedMember.setNickname(nickname).catch(() => {
      Logger.warn(`Could not set nickname for ${appliedMember.user.username}`);
    });
  } else {
    await new MessageSender(
      interaction.channel as SendableChannels,
      {
        description: `New nickname for **${displayName}** is longer than 32 chars`,
      },
      { state: EMessageReplyState.error },
    ).sendMessage();
  }
}

async function sendWelcomeMessage(
  interaction: ButtonInteraction,
  appliedMember: GuildMember,
  application: application,
) {
  const mainChat = interaction.guild?.channels.cache.get(
    process.env.MAIN_CHANNEL!,
  );

  if (mainChat && mainChat.isSendable() && (await ConfigManager.isWlcMsgOn())) {
    await new MessageSender(
      mainChat,
      {
        authorImg: appliedMember.displayAvatarURL(),
        authorName: appliedMember.displayName,
        title: `Welcome, ${appliedMember.user.displayName}!`,
        description: `Say hello to our new clan member **${appliedMember.user.displayName}**!`,
        thumbnail: application.roblox_headshot_url || undefined,
        footerText: process.env.CLAN_NAME,
      },
      { state: EMessageReplyState.success },
    ).sendMessage();
  }
}

async function handleApplicationAccept(interaction: ButtonInteraction) {
  await interaction.deferReply();

  const application = await getApplication(interaction);
  if (!application) {
    return;
  }

  const appliedMember = await getAppliedMember(interaction, application);
  if (!appliedMember) {
    return;
  }

  const mainChat = interaction.guild?.channels.cache.get(
    process.env.MAIN_CHANNEL!,
  );
  if (!mainChat || !mainChat.isSendable()) {
    Logger.error("Main chat not found");
  }

  await appliedMember.roles.add(process.env.CLAN_ROLE!);

  const embedContent = {
    title: "You have been accepted",
    description: `You are now a part of **${process.env.CLAN_NAME}**`,
    footerText: "You will be added to the Bladeball clan shortly",
  };
  const dmEmbed = new MessageSender(null, embedContent, {
    state: EMessageReplyState.success,
  }).getEmbed();

  await sendDMWithFallback(appliedMember, dmEmbed, async () => {
    if (mainChat && mainChat.isSendable()) {
      await new MessageSender(
        mainChat as SendableChannels,
        {
          messageContent: appliedMember.toString(),
          ...embedContent,
        },
        { state: EMessageReplyState.success },
      ).sendMessage();
    }
  });

  const embed = new MessageSender(
    null,
    {
      authorImg: appliedMember.displayAvatarURL(),
      authorName: appliedMember.displayName,
      description: `Accepted **${appliedMember.user.username}**'s application`,
      footerText: interaction.user.username,
    },
    { state: EMessageReplyState.success },
  ).getEmbed();

  await interaction.editReply({
    embeds: [embed],
  });

  await updateOriginalEmbed(
    interaction,
    `Accepted by ${interaction.member?.user.username}`,
    0x04ff00,
  );

  await sendPendingInvite(interaction, application, appliedMember);
  await updateNickname(interaction, appliedMember, application);
  await sendWelcomeMessage(interaction, appliedMember, application);
}

async function handleApplicationReject(interaction: ButtonInteraction) {
  await interaction.deferReply();

  const application = await getApplication(interaction);
  if (!application) {
    return;
  }

  await prisma.application.delete({
    where: {
      user_id_msg_id: {
        user_id: application.user_id,
        msg_id: application.msg_id,
      },
    },
  });

  const appliedMember = await getAppliedMember(interaction, application);
  if (!appliedMember) {
    return;
  }

  const embedContent = {
    title: "You have been rejected",
    description: `You have been rejected from joining **${process.env.CLAN_NAME}**`,
    footerText: "Create a ticket for more information",
  };
  const dmEmbed = new MessageSender(null, embedContent, {
    state: EMessageReplyState.error,
  }).getEmbed();

  await sendDMWithFallback(appliedMember, dmEmbed, async () => {
    const error = `Could not DM ${appliedMember.user.username} for rejection`;
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send(error);
    }
    Logger.warn(error);
  });

  const embed = new MessageSender(
    null,
    {
      authorImg: appliedMember.displayAvatarURL(),
      authorName: appliedMember.displayName,
      description: `Rejected **${appliedMember.user.username}**'s application`,
      footerText: interaction.user.username,
    },
    { state: EMessageReplyState.success },
  ).getEmbed();

  await interaction.editReply({
    embeds: [embed],
  });

  await updateOriginalEmbed(
    interaction,
    `Rejected by ${interaction.member?.user.username}`,
    0xff0000,
  );
}

async function handleApplicationDelete(interaction: ButtonInteraction) {
  await interaction.deferReply();

  const application = await getApplication(interaction);
  if (!application) {
    return;
  }

  await prisma.application.delete({
    where: {
      user_id_msg_id: {
        user_id: application.user_id,
        msg_id: application.msg_id,
      },
    },
  });

  const appliedMember = await getAppliedMember(interaction, application);
  if (!appliedMember) {
    return;
  }

  const embedContent: TMessageReplyPayload = {
    authorName: process.env.CLAN_NAME,
    title: "Your application has been deleted",
    description: `Your application at **${process.env.CLAN_NAME}** has been deleted.\nThis could be due to various reasons.\nYou can reapply at any time.`,
    footerText: "Create a ticket for more information",
    color: 0xf49f00,
  };
  const dmEmbed = new MessageSender(null, embedContent, {
    state: EMessageReplyState.none,
  }).getEmbed();

  await sendDMWithFallback(appliedMember, dmEmbed, async () => {
    const error = `Could not DM ${appliedMember.user.username}`
    if (interaction.channel?.isSendable()) {
      await interaction.channel.send(error);
    }
    Logger.warn(error);
  });

  const embed = new MessageSender(
    null,
    {
      authorImg: appliedMember.displayAvatarURL(),
      authorName: appliedMember.displayName,
      description: `Deleted **${appliedMember.user.username}**'s application`,
      footerText: interaction.user.username,
    },
    { state: EMessageReplyState.success },
  ).getEmbed();

  await interaction.editReply({
    embeds: [embed],
  });

  await updateOriginalEmbed(
    interaction,
    `Deleted by ${interaction.member?.user.username}`,
    0xa0a0a0,
  );
}

async function handleApplicationVerifyAndWaitlist(
  interaction: ButtonInteraction,
) {
  await interaction.deferReply();

  const application = await getApplication(interaction);
  if (!application) {
    return;
  }

  const appliedMember = await getAppliedMember(interaction, application);
  if (!appliedMember) {
    return;
  }

  await appliedMember.roles.add([
    process.env.WAITLIST_ROLE!,
    process.env.VERIFIED_ROLE!,
  ]);
  await appliedMember.roles.remove(process.env.UNVERIFIED_ROLE!);

  const embed = new MessageSender(
    null,
    {
      authorImg: appliedMember.displayAvatarURL(),
      authorName: appliedMember.displayName,
      description: `Verified and waitlisted **${appliedMember.user.username}**`,
      footerText: interaction.user.username,
    },
    { state: EMessageReplyState.success },
  ).getEmbed();

  await interaction.editReply({
    embeds: [embed],
  });
}

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    switch (interaction.customId) {
      case "application_accept":
        await handleApplicationAccept(interaction);
        break;
      case "application_reject":
        await handleApplicationReject(interaction);
        break;
      case "application_delete":
        await handleApplicationDelete(interaction);
        break;
      case "application_verify_and_waitlist":
        await handleApplicationVerifyAndWaitlist(interaction);
        break;
      default:
        break;
    }
  },
};

export default event;
