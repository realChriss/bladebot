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
import { saveUserInput } from "../stores/applyModalStore";
import prisma from "../../db/prisma";
import ConfigManager from "../../utils/ConfigManager";

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

const verifyAndWaitlistComponent = {
  type: 2,
  label: "Verify and Waitlist",
  style: 2,
  custom_id: "application_verify_and_waitlist",
};

function isValidInteger(value: string): boolean {
  return /^\d+$/.test(value);
}

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
  username: string,
  robloxUsername: string,
  age: string,
  killCount: string,
  winCount: string,
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

  saveUserInput(userid, store_username, store_age, store_kill, store_win);

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
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
      const age = interaction.fields
        .getTextInputValue("age")
        .replace(/[.,]/g, "");
      const killCount = interaction.fields
        .getTextInputValue("killCount")
        .replace(/[.,]/g, "");
      const winCount = interaction.fields
        .getTextInputValue("winCount")
        .replace(/[.,]/g, "");

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
      );

      if (validation.valid) {
        const channel = interaction.guild?.channels.cache.get(
          process.env.APPLICATION_CHANNEL!,
        );

        if (!channel || !channel.isSendable()) {
          Logger.error("❌ Application channel not found");
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
            roblox_avatar_url: robloxAvatar?.avatar,
            roblox_headshot_url: robloxAvatar?.headshot,
          },
        });

        const response = (await ConfigManager.isAppOpen())
          ? "✅ Application submitted!\n\n" +
            "**What's next?**\n" +
            "• Your application will be reviewed by our staff team\n" +
            "• You'll receive a response via DM from this bot\n\n" +
            "Please ensure you have DMs enabled for this server"
          : "Applications are currently closed.\nYou have been placed on the **waitlist**";

        const responseEmbed = new MessageSender(
          null,
          {
            description: response,
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
    }
  },
};

export default event;
