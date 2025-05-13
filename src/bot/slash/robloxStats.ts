import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
} from "discord.js";
import axios from "axios";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import ClientSlash from "../classes/ClientSlash";
import Logger from "../../utils/Logger";
import { env } from "../../env";

interface RobloxUserData {
  id: number;
  name: string;
}

interface RobloxProfileData {
  id: number;
  name: string;
  displayName: string;
  description: string;
  created: string;
}

interface RobloxAvatarData {
  avatar: string;
  headshot: string;
}

async function sendReply(
  interaction: ChatInputCommandInteraction,
  payload: TMessageReplyPayload,
  state: EMessageReplyState,
): Promise<void> {
  const sender = new MessageSender(null, payload, { state });
  await interaction.editReply({
    embeds: [sender.getEmbed()],
  });
}

async function fetchRobloxUser(
  username: string,
): Promise<RobloxUserData | null> {
  try {
    const response = await axios.post(
      "https://users.roblox.com/v1/usernames/users",
      {
        usernames: [username],
        excludeBannedUsers: true,
      },
    );

    const userData = response.data.data[0];
    return userData || null;
  } catch (error) {
    Logger.error(`Error fetching Roblox user data: ${error}`);
    return null;
  }
}

async function fetchRobloxProfile(
  userId: number,
): Promise<RobloxProfileData | null> {
  try {
    const response = await axios.get(
      `https://users.roblox.com/v1/users/${userId}`,
    );
    return response.data;
  } catch (error) {
    Logger.error(`Error fetching Roblox profile: ${error}`);
    return null;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getRobloxAvatar(
  userId: number,
): Promise<RobloxAvatarData | null> {
  const maxRetries = 5;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
      if (avatarUrl) {
        const headshotUrl = avatarUrl.replace(/Avatar/g, "AvatarHeadshot");
        return {
          avatar: avatarUrl,
          headshot: headshotUrl,
        };
      }

      if (attempt < maxRetries) {
        Logger.warn(
          `Attempt ${attempt} failed to get avatar for ${userId}, retrying...`,
        );
        await delay(retryDelay);
      }
    } catch (error) {
      if (attempt < maxRetries) {
        Logger.error(
          `Attempt ${attempt} failed with error for ${userId}: ${error}, retrying...`,
        );
        await delay(retryDelay);
      } else {
        Logger.error(
          `All attempts failed to fetch Roblox avatar for ${userId}: ${error}`,
        );
      }
    }
  }

  return null;
}

function findDiscordUser(
  robloxUser: string,
  client: Client,
): GuildMember | null {
  const server = client.guilds.cache.get(env.SERVER_ID);
  if (!server) {
    Logger.error(`Server not found`);
    return null;
  }

  return (
    server.members.cache.find((member) =>
      member.displayName
        .toLowerCase()
        .includes(`(${robloxUser.toLowerCase()})`),
    ) || null
  );
}

function createProfileEmbed(
  profileData: RobloxProfileData,
  discordUser: GuildMember | null,
  avatarData: RobloxAvatarData | null,
  username: string,
): TMessageReplyPayload {
  return {
    title: `${profileData.name}'s Profile`,
    description: profileData.description || "No description available.",
    fields: [
      {
        name: "User ID",
        value: profileData.id.toString(),
        inline: true,
      },
      {
        name: "Display Name",
        value: profileData.displayName || "Not set",
        inline: true,
      },
      {
        name: "Account Created",
        value: new Date(profileData.created).toDateString(),
      },
      {
        name: "Discord User",
        value: discordUser
          ? `${discordUser.displayName}\n${discordUser.toString()}`
          : "Not found",
        inline: true,
      },
    ],
    color: 0x5865f2,
    image: avatarData?.avatar,
    thumbnail: avatarData?.headshot,
    footerText: username,
  };
}

function createErrorEmbed(
  errorMsg: string,
  username: string,
): TMessageReplyPayload {
  return {
    description: errorMsg,
    footerText: username,
  };
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("roblox-stats")
    .setDescription("Fetches Roblox profile data for a given username")
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

    const username = interaction.options.getString("username");
    if (!username) {
      await sendReply(
        interaction,
        createErrorEmbed("Username is required", interaction.user.username),
        EMessageReplyState.error,
      );
      return;
    }

    const userData = await fetchRobloxUser(username);
    if (!userData) {
      await sendReply(
        interaction,
        createErrorEmbed(
          `No Roblox user found with the username: **${username}**`,
          interaction.user.username,
        ),
        EMessageReplyState.error,
      );
      return;
    }

    try {
      const [profileData, avatarData] = await Promise.all([
        fetchRobloxProfile(userData.id),
        getRobloxAvatar(userData.id),
      ]);

      if (!profileData) {
        await sendReply(
          interaction,
          createErrorEmbed(
            `Could not fetch profile data for ${username}`,
            interaction.user.username,
          ),
          EMessageReplyState.error,
        );
        return;
      }

      const discordUser = findDiscordUser(username, client);

      const profileEmbed = createProfileEmbed(
        profileData,
        discordUser,
        avatarData,
        interaction.user.username,
      );
      await sendReply(interaction, profileEmbed, EMessageReplyState.success);
    } catch (error) {
      Logger.error(`Error in Roblox stats command: ${error}`);
      await sendReply(
        interaction,
        createErrorEmbed(
          "An error occurred while fetching Roblox data.",
          interaction.user.username,
        ),
        EMessageReplyState.error,
      );
    }
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
