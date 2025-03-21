import ClientEvent from "../classes/ClientEvent";
import { ButtonInteraction, Events, Interaction } from "discord.js";
import { getUserInput } from "../stores/applyModalStore";
import prisma from "../../db/prisma";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";

const cancelApplicationButton = {
  type: 1,
  components: [
    {
      type: 2,
      label: "Cancel Application",
      style: 4,
      custom_id: "application_cancel",
    },
  ],
};

function createPrefilledModal(userId: string) {
  const userInput = getUserInput(userId);

  return {
    custom_id: "robloxUserModal",
    title: "User Information",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "robloxUsername",
            label: "Roblox Username (NOT display name)",
            style: 1,
            min_length: 3,
            max_length: 20,
            required: true,
            value: userInput.robloxUsername || undefined,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "age",
            label: "How old are you?",
            style: 1,
            min_length: 1,
            max_length: 2,
            required: true,
            value: userInput.age || undefined,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "killCount",
            label: "How many kills do you have?",
            style: 1,
            required: true,
            max_length: 6,
            value: userInput.killCount || undefined,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "winCount",
            label: "How many wins do you have?",
            style: 1,
            required: true,
            max_length: 5,
            value: userInput.winCount || undefined,
          },
        ],
      },
    ],
  };
}

function userHasClanRole(interaction: ButtonInteraction) {
  const member = interaction.guild?.members.cache.get(
    interaction.member?.user.id!,
  );

  const roles = Array.from(member?.roles.cache.keys()!);
  return roles.includes(process.env.CLAN_ROLE!);
}

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (!interaction.isButton()) {
      return;
    }

    if (interaction.customId === "apply_modal_open") {
      if (userHasClanRole(interaction)) {
        await interaction.reply({
          content: "You are already in the clan",
          ephemeral: true,
        });
        return;
      }

      const application = await prisma.application.findFirst({
        where: {
          user_id: interaction.member?.user.id,
        },
      });

      if (application) {
        const embed = new MessageSender(
          null,
          {
            title: "Warning",
            description:
              "You already have a pending application.\nYou can cancel it using the button below",
          },
          { state: EMessageReplyState.error },
        ).getEmbed();

        await interaction.reply({
          embeds: [embed],
          components: [cancelApplicationButton],
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(
        createPrefilledModal(interaction.member?.user.id!),
      );
      return;
    }
  },
};

export default event;
