import ClientEvent from "../classes/ClientEvent";
import { Events, Interaction, ButtonInteraction } from "discord.js";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import {
  getAppliedMember,
  getApplication,
} from "../../utils/applicationActionUtils";

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
    if (interaction.customId === "application_verify_and_waitlist") {
      await handleApplicationVerifyAndWaitlist(interaction);
    }
  },
};

export default event;
