import ClientEvent from "../classes/ClientEvent";
import {
  ButtonInteraction,
  Events,
  GuildTextBasedChannel,
  Interaction,
  SendableChannels,
} from "discord.js";
import prisma from "../../db/prisma";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";
import Logger from "../../utils/Logger";
import { TMessageReplyPayload } from "../types/MsgReplyPayload";
import ConfigManager from "../../utils/ConfigManager";

async function getApplication(interaction: ButtonInteraction) {
  const application = await prisma.application.findFirst({
    where: {
      msg_id: interaction.message.id,
    },
  });

  if (!application) {
    await interaction.editReply({
      content: "This application does not exist in database",
    });
    return;
  }

  return application;
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
    if (!interaction.isButton()) {
      return;
    }

    if (interaction.customId === "application_accept") {
      await interaction.deferReply();
      const application = await getApplication(interaction);
      if (!application) {
        return;
      }

      const appliedMember = interaction.guild?.members.cache.get(
        application.user_id,
      );
      if (!appliedMember) {
        await interaction.editReply("This user is not in the server");
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

      const embed = new MessageSender(
        interaction.channel as SendableChannels,
        embedContent,
        { state: EMessageReplyState.success },
      ).getEmbed();

      await appliedMember.createDM().catch(() => null);

      await appliedMember.dmChannel
        ?.send({ embeds: [embed] })
        .catch(async () => {
          if (!mainChat) {
            return;
          }

          await new MessageSender(
            mainChat as SendableChannels,
            {
              messageContent: `<@${appliedMember.id}>`,
              ...embedContent,
            },
            { state: EMessageReplyState.success },
          ).sendMessage();
        });

      await interaction.editReply(
        `Success: Accepted \`${appliedMember.user.username}\``,
      );
      await interaction.message.edit({
        embeds: [
          {
            ...interaction.message.embeds[0].data,
            footer: {
              text: `Accepted by ${interaction.member?.user.username}`,
            },
            color: 0x04ff00,
          },
        ],
        components: [],
      });

      const invChannel = interaction.guild?.channels.cache.get(
        process.env.PENDING_INV_CHANNEL!,
      );
      if (!invChannel || !invChannel.isSendable()) {
        Logger.error("Invite channel not found");
        return;
      }

      const invMessage = new MessageSender(
        invChannel as GuildTextBasedChannel,
        {
          messageContent: `<@${interaction.member?.user.id}>`,
          title: "Pending Invite",
          description: `Roblox Username: \`${application.roblox_user}\`\n\nDiscord User: \`${appliedMember.user.username}\`\nDiscord Ping: <@${application.user_id}>`,
          thumbnail: application.roblox_headshot_url || undefined,
          footerText:
            "Press the button, after the user was invited to the clan",
          color: 0xffffff,
        },
        {
          state: EMessageReplyState.none,
        },
      );

      const pendingMsg = await invChannel.send({
        content: invMessage.messageContent,
        embeds: [invMessage.getEmbed()],
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

      const displayName = appliedMember.displayName;
      const nickname = `${appliedMember.user.globalName || appliedMember.user.username} (${application.roblox_user})`;

      if (nickname.length <= 32) {
        await appliedMember.setNickname(nickname)
        .catch(() => {
          Logger.warn(`Could not set nickname for ${appliedMember.user.username}`);
        });
      } else {
        const nicknameError = new MessageSender(
          interaction.channel as SendableChannels,
          {
            description: `New nickname for \`${displayName}\` is longer than 32 chars`,
          },
          {
            state: EMessageReplyState.error,
          },
        );
        await nicknameError.sendMessage();
      }

      if (
        mainChat &&
        mainChat.isSendable() &&
        (await ConfigManager.isWlcMsgOn())
      ) {
        await new MessageSender(
          mainChat,
          {
            authorImg: appliedMember.user.displayAvatarURL(),
            authorName: displayName,
            title: `Welcome ${displayName}`,
            description: `Say hello to our new clan member **${displayName}**!`,
            thumbnail: application.roblox_headshot_url || undefined,
          },
          { state: EMessageReplyState.success },
        ).sendMessage();
      }
    } else if (interaction.customId === "application_reject") {
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

      const appliedMember = interaction.guild?.members.cache.get(
        application.user_id,
      );
      if (!appliedMember) {
        await interaction.editReply("This user is not in the server");
        return;
      }

      const embedContent = {
        title: "You have been rejected",
        description: `You have been rejected from joining **${process.env.CLAN_NAME}**`,
        footerText: "Create a ticket for more information",
      };

      await appliedMember.createDM().catch(() => null);
      const embed = new MessageSender(
        interaction.channel as SendableChannels,
        embedContent,
        { state: EMessageReplyState.error },
      ).getEmbed();

      await appliedMember.dmChannel?.send({ embeds: [embed] }).catch(() => {
        Logger.warn(
          `Could not DM ${appliedMember.user.username} for rejection`,
        );
      });

      await interaction.editReply(
        `Success: Rejected \`${application.discord_user}\``,
      );
      await interaction.message.edit({
        embeds: [
          {
            ...interaction.message.embeds[0].data,
            footer: {
              text: `Rejected by ${interaction.member?.user.username}`,
            },
            color: 0xff0000,
          },
        ],
        components: [],
      });
    } else if (interaction.customId === "application_delete") {
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

      const appliedMember = interaction.guild?.members.cache.get(
        application.user_id,
      );
      if (!appliedMember) {
        await interaction.editReply("This user is not in the server");
        return;
      }

      const embedContent: TMessageReplyPayload = {
        title: "Your application has been deleted",
        description: `Your application at **${process.env.CLAN_NAME}** has been deleted.\nThis could be due to various reasons.\nYou can reapply at any time.`,
        footerText: "Create a ticket for more information",
        color: 0xf49f00,
      };

      await appliedMember.createDM().catch(() => null);
      const embed = new MessageSender(
        interaction.channel as SendableChannels,
        embedContent,
        { state: EMessageReplyState.none },
      ).getEmbed();

      await appliedMember.dmChannel?.send({ embeds: [embed] }).catch(() => {
        Logger.warn(`Could not DM ${appliedMember.user.username}`);
      });

      await interaction.editReply(
        `Success: Deleted \`${application.discord_user}\``,
      );
      await interaction.message.edit({
        embeds: [
          {
            ...interaction.message.embeds[0].data,
            footer: {
              text: `Deleted by ${interaction.member?.user.username}`,
            },
            color: 0xa0a0a0,
          },
        ],
        components: [],
      });
    } else if (interaction.customId === "application_verify_and_waitlist") {
      await interaction.deferReply();
      const application = await getApplication(interaction);
      if (!application) {
        return;
      }

      const appliedMember = interaction.guild?.members.cache.get(
        application.user_id,
      );
      if (!appliedMember) {
        await interaction.editReply("This user is not in the server");
        return;
      }

      await appliedMember.roles.add([
        process.env.WAITLIST_ROLE!,
        process.env.VERIFIED_ROLE!,
      ]);
      await appliedMember.roles.remove(process.env.UNVERIFIED_ROLE!);

      await interaction.editReply(
        `Success: Verified and waitlisted \`${application.discord_user}\``,
      );
    }
  },
};

export default event;
