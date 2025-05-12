import fs from "node:fs";
import path from "node:path";
import Logger from "../utils/Logger";
import moment from "moment-timezone";
import ClientCommand from "./classes/ClientCommand";
import client from "./client";
import MessageSender, { EMessageReplyState } from "./classes/MessageSender";
import { Channel, GuildMember, Message, PermissionFlagsBits } from "discord.js";
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

export default class CommandHandler {
  private static commands: TCommandCollection = new Map();

  public static initCommands(): void {
    const files = fs.readdirSync(path.join(__dirname, "cmds"));

    for (const file of files) {
      if (
        (!file.endsWith(".ts") && !file.endsWith(".js")) ||
        file.startsWith("_")
      ) {
        Logger.warn("Skipping command file: " + file);
        continue;
      }
      const command: ClientCommand = require(
        path.join(__dirname, "cmds", file),
      ).default;
      this.commands.set(command.aliases, command);
    }
  }

  private static findCommand(cmdName: string): ClientCommand | null {
    for (const [cmdAliases, cmdData] of this.commands) {
      if (cmdAliases.includes(cmdName)) {
        return cmdData;
      }
    }
    return null;
  }

  private static getValidations(
    command: ClientCommand,
    msg: Message,
    member: GuildMember,
    channel: Channel,
  ): TCommandValidations {
    const {
      isDisabled = false,
      disabledChannels = [],
      disabledUsers = [],
    } = command.options;

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
      isDisabledChannel: disabledChannels.includes(msg.channel.id),
      get isStaff() {
        return (
          member.roles.cache.has(env.STAFF_ROLE) ||
          this.isChriss ||
          this.isDev ||
          this.isAdmin
        );
      },
    } as TCommandValidations;
  }

  private static validateOptions(
    validations: TCommandValidations,
    command: ClientCommand,
    msg: Message,
    displayname: string,
  ): boolean {
    if (validations.isDisabled) {
      this.reply(
        msg,
        {
          description: "This command is disabled",
          footerText: displayname,
        },
        {
          state: EMessageReplyState.error,
          deleteAfterSecs: 5,
        },
      );
      return false;
    } else if (
      command.options.onlyBotChannel &&
      !validations.isBotChannel &&
      !validations.isChriss &&
      !validations.isDev &&
      !validations.isAdmin
    ) {
      this.reply(
        msg,
        {
          description: `This command can only be executed in <#${env.BOT_CHANNEL}>`,
          footerText: displayname,
        },
        {
          state: EMessageReplyState.error,
          deleteAfterSecs: 10,
        },
      );
      return false;
    } else if (
      command.options.disabledChannels?.includes(msg.channel.id) &&
      !validations.isChriss &&
      !validations.isDev &&
      !validations.isAdmin
    ) {
      this.reply(
        msg,
        {
          description: "This channel is excluded from this command",
          footerText: displayname,
        },
        {
          state: EMessageReplyState.error,
          deleteAfterSecs: 10,
        },
      );
      return false;
    } else if (
      command.options.disabledUsers?.includes(msg.author.id) &&
      !validations.isChriss
    ) {
      this.reply(
        msg,
        {
          description: "You are excluded from this command",
          footerText: displayname,
        },
        {
          state: EMessageReplyState.error,
          deleteAfterSecs: 10,
        },
      );
      return false;
    } else if (
      (command.options.allowChriss && validations.isChriss) ||
      (command.options.allowDev && validations.isDev) ||
      (command.options.allowAdmin && validations.isAdmin) ||
      (command.options.allowAdmin && validations.isAdmin) ||
      (command.options.allowStaff && validations.isStaff) ||
      (command.options.allowEveryone && validations.isEveryone)
    ) {
      return true;
    } else {
      this.reply(
        msg,
        {
          description: "You do not have permission for this command",
          footerText: displayname,
        },
        {
          state: EMessageReplyState.error,
          deleteAfterSecs: 10,
        },
      );
      return false;
    }
  }

  private static async reply(
    msg: Message,
    payload: TMessageReplyPayload,
    options: TMessageReplyOptions,
  ) {
    const replyObj = new MessageSender(msg, payload, options);
    await replyObj.sendMessage();
  }

  public static handleCommand(cmdName: string, msg: Message): boolean {
    if (msg.member === null) {
      Logger.warn("Msg author is not a member");
      return false;
    }

    // Finding the command by name
    const command = this.findCommand(cmdName);
    if (command === null) {
      Logger.warn(
        `None existant command: ${cmdName} executed by ${msg.author.username}`,
      );
      this.reply(
        msg,
        {
          description: "This command does not exist",
        },
        {
          state: EMessageReplyState.error,
          deleteAfterSecs: 5,
        },
      );
      return false;
    }

    const validations = this.getValidations(
      command,
      msg,
      msg.member,
      msg.channel,
    );

    // Validate command options
    const canExecute = this.validateOptions(
      validations,
      command,
      msg,
      msg.member.displayName,
    );
    if (!canExecute) {
      Logger.info(
        `${msg.author.username} got rejected for command: ${cmdName}`,
      );
      return false;
    }

    // Checking cooldown
    if (command.options.cooldown && !validations.isStaff) {
      const seconds = CooldownManager.checkCooldown(
        msg.member.id,
        command.aliases.join("-"),
        command.options.cooldown,
      );

      if (seconds instanceof Error) {
        return false;
      }

      if (seconds) {
        this.reply(
          msg,
          {
            description: `Du hast einen Cooldown von ${seconds} Sekunden`,
            footerText: msg.author.displayName,
          },
          {
            state: EMessageReplyState.error,
            deleteAfterSecs: 10,
          },
        );
        return false;
      }
    }

    command.command(client, msg);
    Logger.info(`${msg.author.username} executed command: ${cmdName}`);
    return true;
  }
}
