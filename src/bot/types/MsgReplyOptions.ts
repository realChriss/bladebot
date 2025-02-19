import { EMessageReplyState } from "./MsgReplyState";

export type TMessageReplyOptions = {
  deleteAfterSecs?: number;
  state: EMessageReplyState;
};
