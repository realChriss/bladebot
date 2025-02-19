import { Message, SendableChannels } from "discord.js";
import { TMessageReplyOptions } from "./MsgReplyOptions";
import { TMessageEmbedFields } from "./MsgEmbedFields";
import { TMessageEmbed } from "./MsgEmbed";

export interface IMessageSender {
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
