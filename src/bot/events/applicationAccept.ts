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
import { logApplicationAction } from "../../utils/applicationStatsUtils";
import { env } from "../../env";
import { normalizeString } from "../../utils/stringUtils";

async function sendPendingInvite(
  interaction: ButtonInteraction,
  application: application,
  appliedMember: GuildMember,
  normalizedName: string,
) {
  const invChannel = interaction.guild?.channels.cache.get(
    env.PENDING_INV_CHANNEL,
  );

  if (!invChannel || !invChannel.isSendable()) {
    Logger.error("Invite channel not found");
    return;
  }

  const inviteMsg = new MessageSender(
    invChannel,
    {
      authorName: normalizedName,
      authorImg: appliedMember.displayAvatarURL({
        size: 128,
        extension: "webp",
      }),
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
  normalizedName: string,
) {
  const sendError = (msg: string) => {
    new MessageSender(
      interaction.channel as SendableChannels,
      {
        description: msg,
      },
      { state: EMessageReplyState.error },
    ).sendMessage();
  };

  const sendInfo = (msg: string) => {
    new MessageSender(
      interaction.channel as SendableChannels,
      {
        description: msg,
        color: 0xffffff,
      },
      { state: EMessageReplyState.none },
    ).sendMessage();
  };

  const part1 = normalizedName;
  const part2 = `(${application.roblox_user})`;
  const oldName = appliedMember.displayName;
  let nickname = `${part1} ${part2}`;

  if (part1.toLowerCase().endsWith(part2.toLowerCase())) {
    // If the old name already ends with the Roblox username, we only need to update the first part
    nickname = part1;
  }

  if (nickname.length > 32) {
    sendError(
      `Nickname too long for **${appliedMember.user.username}**: ${nickname.length} characters`,
    );
    return;
  }

  await appliedMember
    .setNickname(nickname)
    .then(() => {
      if (normalizedName !== oldName) {
        sendInfo(`Normalized name for **${oldName}** to **${normalizedName}**`);
      }
    })
    .catch((err) => {
      sendError(
        `Could not set nickname for **${appliedMember.user.username}**: ${err.message}`,
      );
    });
}

async function sendWelcomeMessage(
  interaction: ButtonInteraction,
  appliedMember: GuildMember,
  application: application,
  normalizedName: string,
) {
  const mainChat = interaction.guild?.channels.cache.get(env.MAIN_CHANNEL);

  if (mainChat && mainChat.isSendable() && (await ConfigManager.isWlcMsgOn())) {
    await new MessageSender(
      mainChat,
      {
        authorImg: appliedMember.displayAvatarURL(),
        authorName: appliedMember.displayName,
        title: `Welcome, ${normalizedName}!`,
        description: `Say hello to our new clan member **${normalizedName}**!`,
        thumbnail: application.roblox_headshot_url || undefined,
        footerText: env.CLAN_NAME,
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

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (
      !interaction.isButton() ||
      interaction.customId !== "application_accept"
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

    const normalizedName = normalizeString(appliedMember.displayName);

    const mainChat = interaction.guild?.channels.cache.get(env.MAIN_CHANNEL);
    if (!mainChat || !mainChat.isSendable()) {
      Logger.error("Main chat not found");
    }

    await appliedMember.roles.add([env.CLAN_ROLE, env.VERIFIED_ROLE!]);
    await appliedMember.roles.remove([
      env.UNVERIFIED_ROLE!,
      env.WAITLIST_ROLE!,
      env.TRYOUT_PENDING_ROLE!,
    ]);

    const embedContent: TMessageReplyPayload = {
      authorName: env.CLAN_NAME,
      title: "You have been accepted",
      description: `You are now a part of **${env.CLAN_NAME}**`,
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
        authorName: normalizedName,
        description: `✅ Accepted **${appliedMember.user.username}**'s application`,
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

    await sendPendingInvite(
      interaction,
      application,
      appliedMember,
      normalizedName,
    );
    await updateNickname(
      interaction,
      appliedMember,
      application,
      normalizedName,
    );
    await sendWelcomeMessage(
      interaction,
      appliedMember,
      application,
      normalizedName,
    );

    await logApplicationAction(application, "accepted", interaction.user.id);
  },
};

export default event;
