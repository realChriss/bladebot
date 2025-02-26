import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
} from "discord.js";
import axios from "axios";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";
import ClientSlash from "../classes/ClientSlash";
import { TMessageReplyPayload } from "../types/MsgReplyPayload";
import Logger from "../../utils/Logger";

function getUsername(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString("username")!;
}

function fetchRobloxUser(username: string) {
  return axios
    .post("https://users.roblox.com/v1/usernames/users", {
      usernames: [username],
      excludeBannedUsers: true,
    })
    .then((response) => response.data);
}

function fetchRobloxProfile(userId: number) {
  return axios
    .get(`https://users.roblox.com/v1/users/${userId}`)
    .then((response) => response.data);
}

async function getRobloxAvatar(
  userId: number,
): Promise<{ avatar: string; headshot: string } | null> {
  const avatarResponse = await axios.get(
    "https://thumbnails.roblox.com/v1/users/avatar",
    {
      params: {
        userIds: userId,
        size: "420x420",
        format: "Png",
        isCircular: false,
      },
      validateStatus: () => true,
      timeout: 2000,
    },
  );

  const avatarUrl = avatarResponse.data?.data?.[0]?.imageUrl as string;
  if (!avatarUrl) {
    return null;
  }

  const headshotUrl = avatarUrl.replace(/Avatar/g, "AvatarHeadshot");
  return { avatar: avatarUrl, headshot: headshotUrl };
}

function findDiscordUser(
  robloxUser: string,
  client: Client,
): GuildMember | null {
  const server = client.guilds.cache.get(process.env.SERVER_ID!);

  if (!server) {
    return null;
  }

  const member = server.members.cache.find((member) =>
    member.displayName.toLowerCase().includes(`(${robloxUser.toLowerCase()})`),
  );

  return member || null;
}

async function sendRobloxProfileMessage(
  interaction: ChatInputCommandInteraction,
  profileData: any,
  discordUser: GuildMember | null,
  avatarData: { avatar: string; headshot: string } | null,
) {
  const messagePayload: TMessageReplyPayload = {
    title: `${profileData.name}'s Profile`,
    description: profileData.description || "No description available.",
    fields: [
      { name: "User ID", value: profileData.id.toString(), inline: true },
      {
        name: "Account Created",
        value: new Date(profileData.created).toDateString(),
        inline: true,
      },
      {
        name: "Discord User",
        value: discordUser ? `${discordUser.displayName}\n${discordUser.toString()}` : "Not found",
      },
    ],
    color: 0x5865f2,
    image: avatarData ? avatarData.avatar : undefined,
    thumbnail: avatarData ? avatarData.headshot : undefined,
    footerText: interaction.user.username,
  };

  const sender = new MessageSender(null, messagePayload, {
    state: EMessageReplyState.success,
  });

  await interaction.editReply({
    embeds: [sender.getEmbed()],
  });
}

async function sendErrorResponse(
  interaction: ChatInputCommandInteraction,
  errorMsg: string,
) {
  const messagePayload: TMessageReplyPayload = {
    description: errorMsg,
    color: 0xff0000,
    footerText: interaction.user.username,
  };

  const sender = new MessageSender(null, messagePayload, {
    state: EMessageReplyState.error,
  });

  await interaction.editReply({
    embeds: [sender.getEmbed()],
  });
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("roblox-stats")
    .setDescription("Fetches Roblox profile data for a given username.")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The Roblox username to search for")
        .setRequired(true),
    ) as SlashCommandBuilder,
  exec: async (
    client: Client,
    interaction: ChatInputCommandInteraction,
  ): Promise<void> => {
    await interaction.deferReply();

    const username = getUsername(interaction);

    fetchRobloxUser(username)
      .then((usersResult) => {
        if (usersResult.data.length === 0) {
          sendErrorResponse(
            interaction,
            `No Roblox user found with the username: **${username}**`,
          );
          return;
        }

        const userData = usersResult.data[0];

        return fetchRobloxProfile(userData.id).then((profileData) => {
          return getRobloxAvatar(userData.id).then((avatarData) => {
            const discordUser = findDiscordUser(username, client);
            sendRobloxProfileMessage(
              interaction,
              profileData,
              discordUser,
              avatarData,
            );
          });
        });
      })
      .catch((error) => {
        Logger.error("Error fetching Roblox data: " + error);
        sendErrorResponse(
          interaction,
          "An error occurred while fetching Roblox data.",
        );
      });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowChriss: true,
    allowEveryone: true,
    cooldown: 10,
  },
};

export default command;
