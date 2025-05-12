import fs from "fs";
import path from "path";
import Logger from "../utils/Logger";
import moment from "moment-timezone";
import client from "./client";
import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionContextType,
  PermissionFlagsBits,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import ClientSlash from "./classes/ClientSlash";
import { env } from "../env";

class CooldownManager {
  private static users = new Map<string, number>();
  private static removalQueue: TCooldownRemovalQueue = {};

  private static setCooldown(userId: string, cmdName: string, time: number) {
    const query = userId + cmdName;

    clearTimeout(this.removalQueue[query]);

    const timeout = moment().unix() + time;

    this.users.set(query, timeout);

    this.removalQueue[query] = setTimeout(() => {
      this.users.delete(query);
    }, time * 1000);
  }

  private static getCooldown(userId: string, cmdName: string): number | null {
    const query = userId + cmdName;
    return this.users.get(query) ?? null;
  }

  public static checkCooldown(
    userId: string,
    cmdName: string,
    time: number,
  ): number | false | Error {
    if (time <= 0 || time > 3600) {
      Logger.error("Cooldown not in time span");
      return Error();
    }

    const userCooldown = this.getCooldown(userId, cmdName);

    if (userCooldown) {
      return userCooldown - moment().unix();
    }

    this.setCooldown(userId, cmdName, time);

    return false;
  }
}

export default class SlashHandler {
  private static commands: TSlashCollection = new Map();

  public static async initCommands(): Promise<void> {
    const files = fs.readdirSync(path.join(__dirname, "slash"));
    const commandsToRegister: RESTPostAPIApplicationCommandsJSONBody[] = [];

    for (const file of files) {
      if (
        (!file.endsWith(".ts") && !file.endsWith(".js")) ||
        file.startsWith("_")
      ) {
        Logger.warn("Skipping Slashcommand file: " + file);
        continue;
      }
      const command: ClientSlash = require(
        path.join(__dirname, "slash", file),
      ).default;
      command.data.setContexts(InteractionContextType.Guild);
      this.commands.set(command.data.name, command);
      commandsToRegister.push(command.data.toJSON());
    }

    await client.application?.commands.set(commandsToRegister);
  }

  public static getCommands() {
    return this.commands;
  }

  public static async processCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const command = this.commands.get(interaction.commandName);

    if (!command) {
      await this.reply(interaction, "This command no longer exist");
      return;
    }

    const member = interaction.member as GuildMember;

    // Validation chain
    const validations = this.getValidations(command, interaction);
    const canExecute = this.validateOptions(validations, command, interaction);
    if (!canExecute) {
      Logger.info(
        `${member.user.username} got rejected for slashcommand: ${command.data.name}`,
      );
      return;
    }

    if (command.options.cooldown && !validations.isStaff) {
      const seconds = CooldownManager.checkCooldown(
        member.id,
        command.data.name,
        command.options.cooldown,
      );

      if (seconds instanceof Error) {
        return;
      }

      if (seconds) {
        await this.reply(interaction, `You have a ${seconds} seconds cooldown`);
        return;
      }
    }

    // Execute command
    await command.exec(client, interaction);
    Logger.info(
      `${member.user.username} executed slachcommand: ${command.data.name}`,
    );
  }

  private static async handleError(
    interaction: ChatInputCommandInteraction,
    message: string,
  ): Promise<void> {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: message,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
    }
  }

  private static getValidations(
    command: ClientSlash,
    interaction: ChatInputCommandInteraction,
  ): TSlashValidations {
    const {
      isDisabled = false,
      disabledChannels = [],
      disabledUsers = [],
    } = command.options;

    const member = interaction.member as GuildMember;
    const channel = interaction.channel!;

    return {
      isDisabled: isDisabled,
      isChriss: member.id === env.DEV_ID,
      isDev:
        !!env.DEV_ROLE &&
        Array.from(member.roles.cache.keys()).includes(env.DEV_ROLE),
      isAdmin: member.permissions.has(PermissionFlagsBits.Administrator),
      isEveryone: true,
      isBotChannel: channel.id === env.BOT_CHANNEL,
      isDisabledUser: disabledUsers.includes(member.id),
      isDisabledChannel: disabledChannels.includes(channel.id),
      get isStaff() {
        return (
          member.roles.cache.has(env.STAFF_ROLE) ||
          this.isChriss ||
          this.isDev ||
          this.isAdmin
        );
      },
    } as TSlashValidations;
  }

  private static validateOptions(
    validations: TSlashValidations,
    command: ClientSlash,
    interaction: ChatInputCommandInteraction,
  ): boolean {
    const member = interaction.member as GuildMember;
    const channel = interaction.channel!;

    if (validations.isDisabled) {
      this.reply(interaction, "This command is disabled");
      return false;
    } else if (
      command.options.onlyBotChannel &&
      !validations.isBotChannel &&
      !validations.isChriss &&
      !validations.isDev &&
      !validations.isAdmin
    ) {
      this.reply(
        interaction,
        `This command can only be executed in <#${env.BOT_CHANNEL}>`,
      );
      return false;
    } else if (
      command.options.disabledChannels?.includes(channel.id) &&
      !validations.isChriss &&
      !validations.isDev &&
      !validations.isAdmin
    ) {
      this.reply(interaction, "This channel is excluded from this command");
      return false;
    } else if (
      command.options.disabledUsers?.includes(member.id) &&
      !validations.isChriss
    ) {
      this.reply(interaction, "You are excluded from this command");
      return false;
    } else if (
      (command.options.allowChriss && validations.isChriss) ||
      (command.options.allowDev && validations.isDev) ||
      (command.options.allowAdmin && validations.isAdmin) ||
      (command.options.allowEveryone && validations.isEveryone) ||
      (command.options.allowStaff && validations.isStaff)
    ) {
      return true;
    } else {
      this.reply(interaction, "You do not have permission for this command");
      return false;
    }
  }

  private static async reply(
    interaction: ChatInputCommandInteraction,
    payload: string,
  ) {
    await interaction.reply({
      content: payload,
      ephemeral: true,
    });
  }
}
