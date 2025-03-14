import ClientEvent from "../classes/ClientEvent";
import { Events, GuildMember } from "discord.js";
import Logger from "../../utils/Logger";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";

const event: ClientEvent = {
  name: Events.GuildMemberRemove,
  run: async (member: GuildMember) => {
    if (member.guild.id != process.env.SERVER_ID!) {
      return;
    }

    if (member.roles.cache.has(process.env.CLAN_ROLE!) === false) {
      return;
    }

    Logger.info(`Clan member ${member.displayName} left the server`);

    const applicationChannel = member.guild.channels.cache.get(
      process.env.APPLICATION_CHANNEL!,
    );
    if (!applicationChannel || !applicationChannel.isSendable()) {
      Logger.error("Application channel not found");
      return;
    }

    const embed = new MessageSender(
      applicationChannel,
      {
        title: "Clan Member Left",
        description: `Clan member **${member.displayName}** has left the server.\n\nPing: ${member.toString()}\nUsername: \`${member.user.username}\`\nUser ID: \`${member.id}\``,
        thumbnail: member.user.displayAvatarURL({ size: 128 }),
        authorImg: member.user.displayAvatarURL({ size: 128 }),
        authorName: member.user.username,
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
