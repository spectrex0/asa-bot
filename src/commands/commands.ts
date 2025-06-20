import type { Message as DiscordMessage } from "discord.js";
import { asa } from "../index.ts";

export default function Commands() {
  asa.on("messageCreate", async (message: DiscordMessage) => {
    try {
      if (message.author.bot) return;
      if (!message.content.startsWith("!")) return;

      const args = message.content.slice(1).trim().split(/ +/);
      const command = args.shift()?.toLowerCase();

      // Guilds List
      if (command === "guilds") {
        try {
          const guilds = asa.guilds.cache
            .map((g) => `</> ${g.name} ID: ( ${g.id})`)
            .join("\n");
          return message.reply(
            `[SERVERS COUNT]: ${asa.guilds.cache.size}\n${guilds}`
          );
        } catch (err) {
          return message.reply("[ERROR] Could not fetch guilds.");
        }
      }

      // Clear
      if (command === "clear") {
        if (!message.guild)
          return message.reply("[ERROR] Run this command in a server");
        const amount = parseInt(args[0], 10);
        if (!args[0] || isNaN(amount) || amount < 1 || amount > 100)
          return message.reply("Please provide a number between 1 and 100.");
        const channel = message.channel;
        if (!channel.isTextBased())
          return message.reply(
            "[ERROR] This command can only be used in text channels."
          );
        if (
          channel.type !== 0 && // GuildText
          channel.type !== 5    // GuildAnnouncement
        ) {
          return message.reply(
            "[ERROR] This command can only be used in text or announcement channels."
          );
        }
        try {
          const textChannel = channel as import("discord.js").TextBasedChannel;
          // @ts-ignore
          const messages = await textChannel.bulkDelete(amount, true);
          return message
            .reply(`🧹 Deleted ${messages.size} messages.`)
            .then((msg) => {
              setTimeout(() => msg.delete().catch(() => {}), 3000);
            });
        } catch (err: any) {
          if (err.message?.includes("14 days")) {
            return message.reply(
              "[ERROR] Cannot delete messages older than 14 days."
            );
          }
          return message.reply(
            "[PERMS] Please check my permissions and that messages are not older than 14 days."
          );
        }
      }

      // Setup
      if (command === "setup") {
        if (!message.guild)
          return message.reply("[ERROR] Run this command in a server");

        let jailRole;
        try {
          jailRole = message.guild.roles.cache.find(
            (role) => role.name === "jail"
          );
          if (!jailRole) {
            jailRole = await message.guild.roles.create({
              name: "jail",
              color: "Grey",
              reason: "Role for jailed users",
              permissions: [],
            });
          }
        } catch (err) {
          return message.reply(
            "[PERMS] Could not create jail role. Check my permissions."
          );
        }

        for (const [, channel] of message.guild.channels.cache) {
          if (
            "permissionOverwrites" in channel &&
            typeof channel.permissionOverwrites.edit === "function"
          ) {
            try {
              await channel.permissionOverwrites.edit(jailRole, {
                ViewChannel: false,
                SendMessages: false,
                AddReactions: false,
                Speak: false,
                Connect: false,
              });
            } catch (err) {
              // Ignore permission errors for individual channels
            }
          }
        }

        let jailChannel;
        try {
          jailChannel = message.guild.channels.cache.find(
            (ch) => ch.name === "🔒|jail" && ch.type === 0
          );
          if (!jailChannel) {
            jailChannel = await message.guild.channels.create({
              name: "jail",
              type: 0,
              reason: "Channel for jailed users",
              permissionOverwrites: [
                {
                  id: message.guild.roles.everyone.id,
                  deny: ["ViewChannel"],
                },
                {
                  id: jailRole.id,
                  allow: ["ViewChannel", "SendMessages"],
                },
              ],
            });
          } else {
            if (
              "permissionOverwrites" in jailChannel &&
              typeof jailChannel.permissionOverwrites.edit === "function"
            ) {
              await jailChannel.permissionOverwrites.edit(jailRole, {
                ViewChannel: true,
                SendMessages: true,
              });
              await jailChannel.permissionOverwrites.edit(
                message.guild.roles.everyone,
                {
                  ViewChannel: false,
                }
              );
            }
          }
        } catch (err) {
          return message.reply(
            "[PERMS] Could not create or update jail channel. Check my permissions."
          );
        }

        return message.reply("✅ Jail role and channel have been set up.");
      }

      // Leave
      if (command === "leave") {
        const guildIdToLeave = args[0];
        if (!guildIdToLeave || typeof guildIdToLeave !== "string")
          return message.reply("[ERROR] Please provide a valid server ID.");
        const guildToLeave = asa.guilds.cache.get(guildIdToLeave);
        if (!guildToLeave) {
          return message.reply("[ERROR] Invalid server ID");
        }
        try {
          await guildToLeave.leave();
          return message.reply(`✅ Left server: ${guildToLeave.name}`);
        } catch (err) {
          return message.reply("[ERROR] Could not leave the server. Check my permissions.");
        }
      }
    } catch (err) {
      return message.reply("[ERROR] An unexpected error occurred.");
    }
  });
}
