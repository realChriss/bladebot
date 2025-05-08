import ClientEvent from "../classes/ClientEvent";
import { Events, Message, EmbedBuilder } from "discord.js";

const keywords = ["lucy", "emilia", "forcedivorce", "are now married"];

const event: ClientEvent = {
  name: Events.MessageCreate,
  run: async (message: Message) => {
    if (message.guild?.id != "1202836858292404245") {
      return;
    }

    const messageContent = message.content.toLowerCase();
    const embedContent = message.embeds
      .map((embed) =>
        [
          embed.title,
          embed.description,
          embed.footer,
          embed.author?.name,
          ...embed.fields.map((field) => `${field.name} ${field.value}`),
        ]
          .join(" ")
          .toLowerCase(),
      )
      .join(" ");

    if (
      keywords.some(
        (word) => messageContent.includes(word) || embedContent.includes(word),
      )
    ) {
      try {
        // Get the target user to notify
        const targetUserId = "864209794070741012";
        const targetUser = await message.client.users.fetch(targetUserId);

        // Create notification embed
        const notificationEmbed = new EmbedBuilder()
          .setAuthor({
            name: message.author.tag,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTitle("Keyword Notification")
          .setDescription(`A message containing a keyword was detected`)
          .addFields(
            {
              name: "Channel",
              value: `<#${message.channel.id}>`,
              inline: true,
            },
            { name: "Author", value: `${message.author.tag}`, inline: true },
            {
              name: "Server",
              value: message.guild?.name || "Unknown",
              inline: true,
            },
            { name: "Message Link", value: `[Click Here](${message.url})` },
            {
              name: "Message Content",
              value: message.content || "No text content",
            },
          )
          .setTimestamp()
          .setFooter({
            text: `Server ID: ${message.guild?.id}`,
            iconURL: message.guild?.iconURL() || undefined,
          })
          .setColor("#FF0000");

        // Send the notification with all original embeds
        await targetUser.send({
          embeds: [notificationEmbed, ...message.embeds],
        });

        console.log(
          `Sent keyword notification to user ${targetUserId} for message in channel ${message.channel.id}`,
        );
      } catch (error) {
        console.log(`Failed to send keyword notification: ${error}`);
      }
    }
  },
};

export default event;
