import ClientEvent from "../classes/ClientEvent";
import {
  Events,
  Interaction,
  ButtonInteraction,
  GuildMember,
  SendableChannels,
} from "discord.js";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import Logger from "../../utils/Logger";
import ConfigManager from "../../utils/ConfigManager";
import {
  sendDMWithFallback,
  updateOriginalEmbed,
  getAppliedMember,
  getApplication,
} from "../../utils/applicationActionUtils";
import { application } from "@prisma/client";

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

  const embedContent: TMessageReplyPayload = {
    authorName: process.env.CLAN_NAME,
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

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === "application_accept") {
      await handleApplicationAccept(interaction);
    }
  },
};

export default event;
