import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import MessageSender, { EMessageReplyState } from "../classes/MessageSender";
import ClientSlash from "../classes/ClientSlash";
import SlashHandler from "../slashHandler";

interface CommandInfo {
  name: string;
  description: string;
  subcommands?: { name: string; description: string }[];
}

function formatCommandList(commands: Map<string, ClientSlash>): CommandInfo[] {
  const commandList: CommandInfo[] = [];

  for (const command of commands.values()) {
    if (command.options.isDisabled) continue;

    const cmdInfo: CommandInfo = {
      name: command.data.name,
      description: command.data.description,
    };

    const subcommands = command.data.options.filter(
      (opt) => opt.toJSON().type === 1
    );

    if (subcommands.length > 0) {
      cmdInfo.subcommands = subcommands.map((sub) => ({
        name: sub.toJSON().name,
        description: sub.toJSON().description ?? "No description provided",
      }));
    }

    commandList.push(cmdInfo);
  }

  return commandList.sort((a, b) => a.name.localeCompare(b.name));
}

function buildHelpDescription(commands: CommandInfo[]): string {
  const sections: string[] = [];

  for (const cmd of commands) {
    let cmdText = `• **/${cmd.name}**\n${cmd.description}\n`;

    if (cmd.subcommands && cmd.subcommands.length > 0) {
      cmdText += "\n";
      for (const sub of cmd.subcommands) {
        cmdText += `↳ \`${sub.name}\` - ${sub.description}\n`;
      }
    }

    sections.push(cmdText);
  }

  return sections.join("\n");
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands") as SlashCommandBuilder,

  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const commands = SlashHandler.getCommands();
    const formattedCommands = formatCommandList(commands);
    
    const helpEmbed = new MessageSender(
      null,
      {
        title: "📚 Available Commands",
        description: buildHelpDescription(formattedCommands),
        footerText: interaction.user.username,
        color: 0x5865f2,
      },
      { state: EMessageReplyState.none }
    );

    await interaction.reply({
      embeds: [helpEmbed.getEmbed()],
    });
  },
  options: {
    isDisabled: false,
    onlyBotChannel: true,
    allowEveryone: true,
  },
};

export default command;