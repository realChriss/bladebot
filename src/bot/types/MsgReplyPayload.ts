import { TMessageEmbedFields } from "./MsgEmbedFields";

export type TMessageReplyPayload = {
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
