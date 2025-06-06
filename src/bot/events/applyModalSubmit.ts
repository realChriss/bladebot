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
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import { saveUserInput } from "../stores/applyModalStore";
import prisma from "../../db/prisma";
import ConfigManager from "../../utils/ConfigManager";
import client from "../client";
import { env } from "../../env";

interface ValidationError {
  field: string;
  value: string;
  hint: string;
}

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

const bloodlustComponents = [
  {
    type: 2,
    label: "Demand Tryout",
    style: 2,
    custom_id: "application_demand_tryout",
  },
  {
    type: 2,
    label: "Verify and Waitlist",
    style: 2,
    custom_id: "application_verify_and_waitlist",
  },
];

function isValidInteger(value: string): boolean {
  return /^\d+$/.test(value);
}

function getComponents(guildId: string) {
  if (guildId === "1202836858292404245") {
    return [
      {
        type: 1,
        components: [...components[0].components, ...bloodlustComponents],
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
  return roles.includes(env.CLAN_ROLE);
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

  const sendAvatarReq = async function () {
    try {
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
      return avatarResponse;
    } catch (error) {
      Logger.error(`Error fetching Roblox avatar: ${error}`);
      return null;
    }
  };

  let avatarUrl = "";

  for (let i = 0; i < 5; i++) {
    const avatarResponse = await sendAvatarReq();
    if (avatarResponse && avatarResponse.status === 200) {
      const avatar = avatarResponse.data?.data?.[0]?.imageUrl as string;
      if (avatar) {
        avatarUrl = avatar;
        break;
      }
    }
  }

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
  username: string,
  robloxUsername: string,
  age: string,
  killCount: string,
  winCount: string,
  device: string,
): Promise<{ valid: boolean; errors?: ValidationError[] }> {
  let store_username = "";
  let store_age = "";
  let store_kill = "";
  let store_win = "";

  const errors: ValidationError[] = [];

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

  if (res.data?.data?.length === 1) {
    store_username = robloxUsername;
  } else {
    errors.push({
      field: "Roblox Username",
      value: robloxUsername,
      hint: "Username does not exist or is invalid",
    });
  }

  if (isValidInteger(age)) {
    store_age = age;
  } else {
    errors.push({
      field: "Age",
      value: age,
      hint: "Must be a whole number",
    });
  }

  if (isValidInteger(killCount)) {
    store_kill = killCount;
  } else {
    errors.push({
      field: "Kill Count",
      value: killCount,
      hint: "Must be a whole number",
    });
  }

  if (isValidInteger(winCount)) {
    store_win = winCount;
  } else {
    errors.push({
      field: "Win Count",
      value: winCount,
      hint: "Must be a whole number",
    });
  }

  if (errors.length > 0) {
    const errorLog = errors
      .map((err) => `${err.field}: "${err.value}"`)
      .join(", ");

    Logger.warn(`Invalid application from ${username} - Errors: ${errorLog}`);
  }

  saveUserInput(
    userid,
    store_username,
    store_age,
    store_kill,
    store_win,
    device,
  );

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function getDescription(): Promise<string> {
  let text = "✅ Application submitted!\n\n";

  text +=
    "**What's next?**\n" +
    "• Watch for pings in this server or DMs from this bot\n" +
    "• Wait for further instructions\n\n";

  if ((await ConfigManager.isAppOpen()) === false) {
    text +=
      "⚠️ **Applications are currently closed.**\n" +
      "You have been placed on the **waitlist**\n";

    const server = client.guilds.cache.get(env.SERVER_ID);

    if (server && server.id === "1202836858292404245") {
      const position =
        (
          await prisma.application.findMany({
            where: {
              pending_msg_id: null,
            },
            select: {
              user_id: true,
            },
          })
        ).filter((application) =>
          server.members.cache
            .get(application.user_id)
            ?.roles.cache.has(env.WAITLIST_ROLE!),
        ).length + 1;

      text += `Your waitlist position: **${position}**`;
    }
  }

  return text.trim();
}

const event: ClientEvent = {
  name: Events.InteractionCreate,
  run: async (interaction: Interaction) => {
    if (
      !interaction.isModalSubmit() ||
      interaction.customId !== "robloxUserModal"
    ) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (userHasClanRole(interaction)) {
      await interaction.editReply({
        content: "❌ You are already in the clan",
      });
      return;
    }

    const robloxUsername =
      interaction.fields.getTextInputValue("robloxUsername");
    const age = interaction.fields
      .getTextInputValue("age")
      .replace(/[.,]/g, "");
    const killCount = interaction.fields
      .getTextInputValue("killCount")
      .replace(/[.,]/g, "");
    const winCount = interaction.fields
      .getTextInputValue("winCount")
      .replace(/[.,]/g, "");
    const device = interaction.fields.getTextInputValue("device");

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

    const validation = await validate(
      interaction.member?.user.id!,
      interaction.member?.user.username!,
      robloxUsername,
      age,
      killCount,
      winCount,
      device,
    );

    if (validation.valid) {
      const channel = interaction.guild?.channels.cache.get(
        env.APPLICATION_CHANNEL,
      );

      if (!channel || !channel.isSendable()) {
        Logger.error("Application channel not found");
        await interaction.editReply({
          content: "Error: Application Channel not found",
        });
        return;
      }

      const member = interaction.member as GuildMember;
      const robloxAvatar = await getRobloxAvatar(robloxUsername);

      const applicationEmbed = new MessageSender(
        channel,
        {
          authorName: member?.displayName,
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
            { name: "Age", value: age },
            { name: "Kill Count", value: killCount },
            { name: "Win Count", value: winCount },
            { name: "Device", value: device },
          ],
          thumbnail: getAvatar(member, 512),
          image: robloxAvatar?.avatar || undefined,
          color: 0xffffff,
        },
        {
          state: EMessageReplyState.none,
        },
      ).getEmbed();

      const applicationMsg = await channel.send({
        embeds: [applicationEmbed],
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
          device: device,
          roblox_avatar_url: robloxAvatar?.avatar,
          roblox_headshot_url: robloxAvatar?.headshot,
        },
      });

      const responseEmbed = new MessageSender(
        null,
        {
          description: await getDescription(),
          thumbnail: robloxAvatar?.headshot,
          footerText: "-> To cancel your application, press on apply again",
        },
        { state: EMessageReplyState.success },
      ).getEmbed();

      await interaction.editReply({
        embeds: [responseEmbed],
      });
    } else {
      const errorFields = validation
        .errors!.map((err) => `**${err.field}**: ${err.hint}`)
        .join("\n");

      const responseEmbed = new MessageSender(
        null,
        {
          description: `Please fix the following errors:\n\n${errorFields}`,
        },
        { state: EMessageReplyState.error },
      ).getEmbed();

      await interaction.editReply({
        embeds: [responseEmbed],
      });
    }
  },
};

export default event;
