import { TMessageEmbedAuthor } from "./MsgEmbedAuthor";
import { TMessageEmbedFields } from "./MsgEmbedFields";
import { TMessageEmbedFooter } from "./MsgEmbedFooter";
import { TMessageEmbedImage } from "./MsgEmbedImage";
import { TMessageEmbedThumbnail } from "./MsgEmbedThumbnail";

export type TMessageEmbed = {
  author?: TMessageEmbedAuthor;
  title?: string;
  description?: string;
  thumbnail?: TMessageEmbedThumbnail;
  fields?: TMessageEmbedFields[];
  footer?: TMessageEmbedFooter;
  image?: TMessageEmbedImage;
  color?: number;
};
