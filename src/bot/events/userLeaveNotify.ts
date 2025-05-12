import ClientEvent from "../classes/ClientEvent";
import { Events, GuildMember } from "discord.js";
import Logger from "../../utils/Logger";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import { env } from "../../env";

const event: ClientEvent = {
  name: Events.GuildMemberRemove,
  run: async (member: GuildMember) => {
    if (member.guild.id != env.SERVER_ID) {
      return;
    }

    if (member.roles.cache.has(env.CLAN_ROLE) === false) {
      return;
    }

    const applicationChannel = member.guild.channels.cache.get(
      env.APPLICATION_CHANNEL,
    );
    if (!applicationChannel || !applicationChannel.isSendable()) {
      Logger.error("Application channel not found");
      return;
    }

    const embed = new MessageSender(
      applicationChannel,
      {
        authorName: member.user.username,
        authorImg: member.user.displayAvatarURL({ size: 128 }),
        title: "Clan Member Left",
        description: `Clan member **${member.displayName}** has left the server.\n\nPing: ${member.toString()}\nDisplay Name: \`${member.displayName}\`\nUser ID: \`${member.id}\``,
        thumbnail: member.user.displayAvatarURL({ size: 128 }),
        color: 0xffbe01,
      },
      {
        state: EMessageReplyState.none,
      },
    );

    await embed.sendMessage();
  },
};

export default event;
