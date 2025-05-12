import ClientEvent from "../classes/ClientEvent";
import { Events, GuildMember, GuildTextBasedChannel } from "discord.js";
import Logger from "../../utils/Logger";
import prisma from "../../db/prisma";
import { env } from "../../env";

async function getApplication(userId: string) {
  const application = await prisma.application.findFirst({
    where: {
      user_id: userId,
    },
  });

  return application;
}

const event: ClientEvent = {
  name: Events.GuildMemberRemove,
  run: async (member: GuildMember) => {
    const application = await getApplication(member.id);
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

    const applicationChannel = member.guild.channels.cache.get(
      env.APPLICATION_CHANNEL,
    ) as GuildTextBasedChannel | undefined;
    if (!applicationChannel) {
      Logger.error("Application channel not found");
      return;
    }

    const inviteChannel = member.guild.channels.cache.get(
      env.PENDING_INV_CHANNEL,
    ) as GuildTextBasedChannel | undefined;
    if (!inviteChannel) {
      Logger.error("Pending invite channel not found");
      return;
    }

    const applicationMessage = await applicationChannel.messages
      .fetch(application.msg_id)
      .catch(() => {
        Logger.error("Application message not found");
        return null;
      });

    if (applicationMessage) {
      await applicationMessage.edit({
        embeds: [
          {
            ...applicationMessage.embeds[0].data,
            footer: { text: `User left the server` },
            color: 0xffbe01,
          },
        ],
        components: [],
      });

      const embed: TMessageEmbed = {
        description:
          "Application has been deleted due to user leaving the server.",
        color: 0xffbe01,
      };

      await applicationMessage
        .reply({
          embeds: [embed],
        })
        .catch((err) => {
          embed.description = `Application of ${member.user.username} has been deleted due to leaving the server.`;

          applicationMessage.channel
            .send({
              embeds: [embed],
            })
            .catch((err) => {
              Logger.error(
                "Failed to send message in application channel: " + err,
              );
              Logger.info(
                `Application by ${member.user.username} has been deleted due to user leaving the server.`,
              );
            });

          Logger.error("Failed to send reply to application message:" + err);
        });
    }

    if (application.pending_msg_id) {
      const pendingMessage = await inviteChannel.messages
        .fetch(application.pending_msg_id)
        .catch(() => {
          Logger.error("Pending invite message not found");
          return null;
        });

      if (pendingMessage) {
        await pendingMessage.edit({
          embeds: [
            {
              ...pendingMessage.embeds[0].data,
              footer: { text: `User left the server` },
              color: 0xffbe01,
            },
          ],
          components: [],
        });
      }
    }
  },
};

export default event;
