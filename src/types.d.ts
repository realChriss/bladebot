import {
  Client,
  Message,
  ChatInputCommandInteraction,
  SendableChannels,
} from "discord.js";
import ClientSlash from "./bot/classes/ClientSlash";

declare global {
  // Command Types
  type TCommandFunction = (
    client: Client,
    msg: Message,
    ...args: any[]
  ) => void | Error | Promise<void> | Promise<Error>;

  interface IClientCommand {
    command: TCommandFunction;
    aliases: string[];
    options: TCommandOptions;
    description?: string;
  }

  type TCommandCollection = Map<string[], IClientCommand>;

  type TCommandOptions = {
    isDisabled: boolean;
    onlyBotChannel: boolean;
    allowChriss?: boolean;
    allowDev?: boolean;
    allowAdmin?: boolean;
    allowStaff?: boolean;
    allowEveryone?: boolean;
    cooldown?: number;
    disabledChannels?: string[];
    disabledUsers?: string[];
  };

  type TCommandValidations = {
    isDisabled: boolean;
    isChriss: boolean;
    isDev: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    isEveryone: boolean;
    isBotChannel: boolean;
    isDisabledUser: boolean;
    isDisabledChannel: boolean;
  };

  // Event Types
  interface IClientEvent {
    name: string;
    run: TEventRun;
    description?: string;
  }

  type TEventRun = (...args: any[]) => void | Promise<void>;

  type TEventCollection = Map<string, TEventRun[]>;

  // Slash Command Types
  type TSlashFunction = (
    client: Client,
    interaction: ChatInputCommandInteraction,
    ...args: any[]
  ) => void | Error | Promise<void> | Promise<Error>;

  type TSlashCollection = Map<string, ClientSlash>;

  type TSlashOptions = {
    isDisabled: boolean;
    onlyBotChannel: boolean;
    allowChriss?: boolean;
    allowDev?: boolean;
    allowAdmin?: boolean;
    allowStaff?: boolean;
    allowEveryone?: boolean;
    cooldown?: number;
    disabledChannels?: string[];
    disabledUsers?: string[];
  };

  type TSlashValidations = {
    isDisabled: boolean;
    isChriss: boolean;
    isDev: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    isEveryone: boolean;
    isBotChannel: boolean;
    isDisabledUser: boolean;
    isDisabledChannel: boolean;
  };

  // Message Embed Types
  type TMessageEmbedAuthor = {
    name: string;
    icon_url: string;
  };

  type TMessageEmbedFields = {
    name: string;
    value: string;
    inline?: boolean;
  };

  type TMessageEmbedFooter = {
    text: string;
    icon_url: string;
  };

  type TMessageEmbedImage = {
    url: string;
  };

  type TMessageEmbedThumbnail = {
    url: string;
  };

  type TMessageEmbed = {
    author?: TMessageEmbedAuthor;
    title?: string;
    description?: string;
    thumbnail?: TMessageEmbedThumbnail;
    fields?: TMessageEmbedFields[];
    footer?: TMessageEmbedFooter;
    image?: TMessageEmbedImage;
    color?: number;
  };

  // Message Reply Types
  type TMessageReplyOptions = {
    deleteAfterSecs?: number;
    state: EMessageReplyState;
  };

  type TMessageReplyPayload = {
    messageContent?: string;
    authorName?: string;
    authorImg?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    fields?: TMessageEmbedFields[];
    footerText?: string;
    footerImg?: string;
    image?: string;
    color?: number;
  };

  // Message Sender Interface
  interface IMessageSender {
    message?: Message;
    channel?: SendableChannels;

    messageContent?: string;
    authorName?: string;
    authorImg?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    fields?: TMessageEmbedFields[];
    footerText?: string;
    footerImg?: string;
    image?: string;
    color?: number;

    options: TMessageReplyOptions;

    getEmbed(): TMessageEmbed;
    sendMessage(): Promise<Message | Error>;
  }

  // Other Types
  type TCooldownRemovalQueue = {
    [query: string]: NodeJS.Timeout | number;
  };
}
