import axios from "axios";
import ClientEvent from "../classes/ClientEvent";
import {
  Events,
  GuildMember,
  ImageSize,
  Interaction,
  ModalSubmitInteraction,
} from "discord.js";
import Logger from "../../utils/Logger";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";
import { saveUserInput } from "../stores/applyModalStore";
import prisma from "../../db/prisma";
import ConfigManager from "../../utils/ConfigManager";

const components = [
  {
    type: 1,
    components: [
      {
        type: 2,
        label: "Accept",
        style: 3,
        custom_id: "application_accept",
      },
      {
        type: 2,
        label: "Reject",
        style: 4,
        custom_id: "application_reject",
      },
      {
        type: 2,
        label: "Delete",
        style: 2,
        custom_id: "application_delete",
      },
    ],
  },
];

const verifyAndWaitlistComponent = {
  type: 2,
  label: "Verify and Waitlist",
  style: 2,
  custom_id: "application_verify_and_waitlist",
};

function getComponents(guildId: string) {
  if (guildId === "1202836858292404245") {
    return [
      {
        type: 1,
        components: [...components[0].components, verifyAndWaitlistComponent],
      },
    ];
  }
  return components;
}

function getAvatar(member: GuildMember, size: ImageSize) {
  const isAnimated = member.avatar?.startsWith("a");

  return member.displayAvatarURL({
    extension: isAnimated ? "gif" : "png",
    size,
  });
}

function userHasClanRole(interaction: ModalSubmitInteraction) {
  const member = interaction.guild?.members.cache.get(
    interaction.member?.user.id!,
  );

  const roles = Array.from(member?.roles.cache.keys()!);
  return roles.includes(process.env.CLAN_ROLE!);
}

async function getRobloxAvatar(
  username: string,
): Promise<{ avatar: string; headshot: string } | null> {
  const userIdResponse = await axios.post(
    "https://users.roblox.com/v1/usernames/users",
    {
      usernames: [username],
      excludeBannedUsers: true,
    },
    {
      validateStatus: () => true,
      timeout: 2000,
    },
  );

  const userId = userIdResponse.data?.data?.[0]?.id;
  if (!userId) {
    return null;
  }

  const avatarResponse = await axios.get(
    `https://thumbnails.roblox.com/v1/users/avatar`,
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

  return {
    avatar: avatarUrl,
    headshot: headshotUrl,
  };
}

async function validate(
  userid: string,
  robloxUsername: string,
  age: string,
  killCount: string,
  winCount: string,
): Promise<boolean | string> {
  let store_username = "";
  let store_age = "";
  let store_kill = "";
  let store_win = "";

  let error: boolean | string = false;

  const res = await axios.post(
    "https://users.roblox.com/v1/usernames/users",
    {
      usernames: [robloxUsername],
      excludeBannedUsers: true,
    },
    {
      validateStatus: () => true,
      timeout: 2000,
    },
  );

  if (res.data?.data?.length === 1) store_username = robloxUsername;
  else error = "Roblox Username";

  if (!isNaN(Number(age))) store_age = age;
  else error = "Age";

  if (!isNaN(Number(killCount))) store_kill = killCount;
  else error = "Kill Count";

  if (!isNaN(Number(winCount))) store_win = winCount;
  else error = "Win Count";

  saveUserInput(userid, store_username, store_age, store_kill, store_win);

  return !error ? true : error;
}

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) {
      return;
    }

    if (interaction.customId === "robloxUserModal") {
      await interaction.deferReply({ ephemeral: true });

      if (userHasClanRole(interaction)) {
        await interaction.editReply({
          content: "❌ You are already in the clan",
        });
        return;
      }

      const robloxUsername =
        interaction.fields.getTextInputValue("robloxUsername");
      const age = interaction.fields.getTextInputValue("age");
      const killCount = interaction.fields.getTextInputValue("killCount");
      const winCount = interaction.fields.getTextInputValue("winCount");

      const application = await prisma.application.findFirst({
        where: {
          user_id: interaction.member?.user.id,
        },
      });

      if (application) {
        await interaction.editReply({
          content: "You have already applied",
        });
        return;
      }

      const validity = await validate(
        interaction.member?.user.id!,
        robloxUsername,
        age,
        killCount,
        winCount,
      );

      if (validity === true) {
        const channel = interaction.guild?.channels.cache.get(
          process.env.APPLICATION_CHANNEL!,
        );

        if (!channel || !channel.isSendable()) {
          Logger.error("❌ Application channel not found");
          await interaction.editReply({
            content: "Error: Channel not found",
          });
          return;
        }

        const member = interaction.member as GuildMember;
        const robloxAvatar = await getRobloxAvatar(robloxUsername);

        const msg = new MessageSender(
          channel,
          {
            authorName: member?.user.username,
            authorImg: getAvatar(member, 128),
            title: "New Application",
            fields: [
              {
                name: "Discord User",
                value: `Username: \`${member.user.username}\`\nDisplay Name: \`${member.displayName}\`\nPing: ${member.toString()}`,
              },
              {
                name: "Roblox User",
                value: `Username: \`${robloxUsername}\``,
              },
              { name: "Age", value: `${age}` },
              { name: "Kill Count", value: `${killCount}` },
              { name: "Win Count", value: `${winCount}` },
            ],
            thumbnail: getAvatar(member, 512),
            image: robloxAvatar?.avatar || undefined,
            color: 0xffffff,
          },
          {
            state: EMessageReplyState.none,
          },
        );

        const embed = msg.getEmbed();

        const applicationMsg = await channel.send({
          embeds: [embed],
          components: getComponents(interaction.guildId!),
        });

        await prisma.application.create({
          data: {
            user_id: member.id,
            msg_id: applicationMsg.id,
            discord_user: member.user.username,
            roblox_user: robloxUsername,
            age: parseInt(age),
            kill: parseInt(killCount),
            win: parseInt(winCount),
            roblox_avatar_url: robloxAvatar?.avatar,
            roblox_headshot_url: robloxAvatar?.headshot,
          },
        });

        const response = (await ConfigManager.isAppOpen())
          ? "✅ Success! Please wait for an answer from this bot.\nPlease make sure that this bot is able to send you a DM."
          : "✅ Success! Applications are currently closed.\nYou are placed on the **waitlist**";

        await interaction.editReply({
          content: response,
        });
      } else {
        await interaction.editReply({
          content: `❌ Error at field **${validity}**. Please try again.`,
        });
      }
    }
  },
};

export default event;
