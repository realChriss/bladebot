import { Message, SendableChannels } from "discord.js";
import { IMessageSender } from "../types/MessageSender";
import { TMessageEmbedFields } from "../types/MsgEmbedFields";
import { TMessageReplyOptions } from "../types/MsgReplyOptions";
import { TMessageReplyPayload } from "../types/MsgReplyPayload";
import { EMessageReplyState } from "../types/MsgReplyState";
import { TMessageEmbed } from "../types/MsgEmbed";

import Logger from "../../utils/Logger";

export default class MessageSender implements IMessageSender {
  readonly message?: Message;
  readonly channel?: SendableChannels;
  readonly messageContent?: string;

  // Embed
  readonly authorName?: string;
  readonly authorImg?: string;
  readonly title?: string;
  readonly description?: string;
  readonly thumbnail?: string;
  readonly fields?: TMessageEmbedFields[];
  readonly footerText?: string;
  readonly footerImg?: string;
  readonly image?: string;
  readonly color?: number;

  // Message options
  readonly options: TMessageReplyOptions;

  constructor(
    target: Message | SendableChannels | null,
    payload: TMessageReplyPayload,
    options: TMessageReplyOptions,
  ) {
    if (target instanceof Message) {
      this.message = target;
    } else if (target !== null && "send" in target) {
      this.channel = target;
    }

    this.messageContent = payload.messageContent;
    this.authorName = payload.authorName;
    this.authorImg = payload.authorImg;
    this.title = payload.title;
    this.description = payload.description;
    this.fields = payload.fields;
    this.thumbnail = payload.thumbnail;
    this.footerText = payload.footerText;
    this.footerImg = payload.footerImg;
    this.image = payload.image;
    this.color = payload.color;

    this.options = options;
  }

  private hasEmbed(): boolean {
    return !!(
      this.authorName ||
      this.title ||
      [EMessageReplyState.success, EMessageReplyState.error].includes(
        this.options.state,
      ) ||
      this.description ||
      this.thumbnail ||
      (this.fields && this.fields.length > 0) ||
      this.footerText ||
      this.image
    );
  }

  private hasMessageContent(): boolean {
    return !!this.messageContent;
  }

  getEmbed(): TMessageEmbed {
    return {
      author: {
        name: this.authorName,
        icon_url: this.authorImg,
      },
      title:
        this.title ??
        (this.options.state === EMessageReplyState.success
          ? `Success`
          : this.options.state === EMessageReplyState.error
            ? `Failure`
            : undefined),
      description: this.description,
      thumbnail: {
        url: this.thumbnail,
      },
      fields: this.fields,
      footer: {
        text: this.footerText,
        icon_url: this.footerImg,
      },
      image: {
        url: this.image,
      },
      color:
        this.color ??
        (this.options.state === EMessageReplyState.success
          ? 0x04ff00
          : this.options.state === EMessageReplyState.error
            ? 0xff0000
            : undefined),
    } as TMessageEmbed;
  }

  async sendMessage(): Promise<Message | Error> {
    if (!this.hasEmbed() && !this.hasMessageContent()) {
      Logger.error("No message payload given");
      return Error();
    }

    const sendPayload = {
      content: this.messageContent,
      embeds: [this.getEmbed()],
    };

    if (this.message) {
      return await this.message
        .reply(sendPayload)
        .then((repliedMessage) => this.handleDeletion(repliedMessage))
        .catch(this.handleError);
    } else if (this.channel) {
      return await this.channel
        .send(sendPayload)
        .then((sentMessage) => this.handleDeletion(sentMessage))
        .catch(this.handleError);
    } else {
      Logger.error("Neither message nor channel provided");
      return Error();
    }
  }

  private handleDeletion(message: Message): Message {
    const timeout = this.options.deleteAfterSecs;
    if (timeout && timeout >= 1 && timeout <= 120) {
      setTimeout(() => {
        message
          .delete()
          .catch((err) =>
            Logger.error(`Could not delete message: ${err.message}`),
          );
      }, timeout * 1000);
    }
    return message;
  }

  private handleError(err: Error): Error {
    Logger.error(`Error sending message: ${err.message}`);
    return err;
  }
}
