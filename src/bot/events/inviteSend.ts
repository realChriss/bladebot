import ClientEvent from "../classes/ClientEvent";
import {
  ButtonInteraction,
  Events,
  GuildTextBasedChannel,
  Interaction,
} from "discord.js";
import MessageSender from "../classes/MessageSender";
import Logger from "../../utils/Logger";
import { EMessageReplyState } from "../types/MsgReplyState";
import prisma from "../../db/prisma";

async function getApplication(interaction: ButtonInteraction) {
  const application = await prisma.application.findFirst({
    where: {
      pending_msg_id: interaction.message.id,
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

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (!interaction.isButton()) {
      return;
    }

    if (interaction.customId === "clan_invite_sent") {
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

      const embed = new MessageSender(
        interaction.channel as GuildTextBasedChannel,
        {
          title: "📩 You have been invited to the clan",
          description: `You have been invited to **${process.env.CLAN_NAME}** in Bladeball!\nCheck your invites.`,
        },
        { state: EMessageReplyState.success },
      ).getEmbed();

      await appliedMember.createDM();

      await appliedMember.dmChannel
        ?.send({ embeds: [embed] })
        .catch(async () => {
          const mainChat = interaction.guild?.channels.cache.get(
            process.env.MAIN_CHANNEL!,
          );
          if (!mainChat || !mainChat.isSendable()) {
            Logger.error("Main chat not found");
            return;
          }

          await mainChat.send({
            content: `<@${application.user_id}>`,
            embeds: [embed],
          });
        });

      await prisma.application.delete({
        where: {
          user_id_msg_id: {
            user_id: application.user_id,
            msg_id: application.msg_id,
          },
        },
      });

      await interaction.editReply(
        `Success: Sent confirmation to \`${appliedMember.user.username}\``,
      );

      await interaction.message.edit({
        embeds: [
          {
            ...interaction.message.embeds[0].data,
            footer: {
              text: `Invited by ${interaction.member?.user.username}`,
            },
            color: 0x04ff00,
          },
        ],
        components: [],
      });
    }
  },
};

export default event;
