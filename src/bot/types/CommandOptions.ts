export type TCommandOptions = {
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
