import { execSync } from "child_process";
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import ClientSlash from "../classes/ClientSlash";
import MessageSender from "../classes/MessageSender";
import { EMessageReplyState } from "../types/MsgReplyState";
import Logger from "../../utils/Logger";

interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

function getGitCommits(count: number = 5): GitCommit[] {
  try {
    const gitLogCommand = `git log -n ${count} --pretty=format:"%h|%an|%ad|%s" --date=short`;
    const output = execSync(gitLogCommand, { encoding: "utf-8" });

    return output
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, author, date, ...messageParts] = line.split("|");
        return {
          hash,
          author,
          date,
          message: messageParts.join("|"),
        };
      });
  } catch (error) {
    Logger.error(`Failed to get git commits: ${error}`);
    return [];
  }
}

function getRepoInfo(): {
  currentBranch: string;
  repoUrl: string;
  commitCount: string;
} {
  try {
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();

    const commitCount = execSync("git rev-list --count HEAD", {
      encoding: "utf-8",
    }).trim();

    // Get the repository URL from the remote origin
    const repoUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf-8",
    })
      .trim()
      .replace(/\.git$/, "") // Remove .git suffix
      .replace(/^git@github\.com:/, "https://github.com/"); // Convert SSH to HTTPS URL

    return {
      currentBranch,
      repoUrl,
      commitCount,
    };
  } catch (error) {
    Logger.error(`Failed to get repo info: ${error}`);
    return {
      currentBranch: "unknown",
      repoUrl: "unknown",
      commitCount: "0",
    };
  }
}

function formatCommitsToMarkdown(commits: GitCommit[]): string {
  const formattedCommits = commits
    .map(
      (commit) =>
        `[${commit.hash}] ${commit.message}\n# Author: ${commit.author}\n# Date: ${commit.date}\n`,
    )
    .join("\n");

  return `\`\`\`md\n${formattedCommits}\`\`\``;
}

const command: ClientSlash = {
  data: new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("Shows the last 5 commits from git") as SlashCommandBuilder,

  exec: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    const commits = getGitCommits();
    const repoInfo = getRepoInfo();

    if (commits.length === 0) {
      const errorEmbed = new MessageSender(
        null,
        {
          description: "No commits found or error reading git history",
          footerText: interaction.user.username,
        },
        { state: EMessageReplyState.error },
      );

      await interaction.editReply({
        embeds: [errorEmbed.getEmbed()],
      });
      
      return;
    }

    const replyEmbed = new MessageSender(
      null,
      {
        title: "📝 Changelog",
        description: [
          `**Branch:** \`${repoInfo.currentBranch}\``,
          `**Repository:** [View on GitHub](${repoInfo.repoUrl})`,
          `**Total Commits:** \`${repoInfo.commitCount}\``,
          "\n**Recent Commits:**",
          formatCommitsToMarkdown(commits),
        ].join("\n"),
        footerText: interaction.user.username,
        color: 0x58b9ff,
      },
      { state: EMessageReplyState.none },
    );

    await interaction.editReply({
      embeds: [replyEmbed.getEmbed()],
    });
  },

  options: {
    isDisabled: false,
    onlyBotChannel: false,
    allowEveryone: true,
    cooldown: 30,
  },
};

export default command;
