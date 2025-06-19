import type { Message as DiscordMessage } from "discord.js";
import { asa } from "../index.ts";

export default function Commands() {
  asa.on("messageCreate", async (message: DiscordMessage) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (command === "guilds") {
      const guilds = asa.guilds.cache
        .map((g) => `</> ${g.name} ID: ( ${g.id})`)
        .join("\n");
      return message.reply(
        `[SERVERS COUNT]: ${asa.guilds.cache.size}\n${guilds}`
      );
    }

    if (command === "clear") {
      const amount = parseInt(args[0], 10);
      if (!message.guild)
        return message.reply("[ERROR] Run this command in a server");
      if (isNaN(amount) || amount < 1 || amount > 100)
        return message.reply("Please provide a number between 1 and 100.");
      const channel = message.channel;
      if (!channel.isTextBased())
        return message.reply(
          "[ERROR] This command can only be used in text channels."
        );
      if (
        channel.type !== 0 &&
        channel.type !== 5   
      ) {
        return message.reply(
          "[ERROR] This command can only be used in text or announcement channels."
        );
      }
      try {
        const messages = await (channel as any).bulkDelete(amount, true);
        return message
          .reply(`🧹 Deleted ${messages.size} messages.`)
          .then((msg) => {
            setTimeout(() => msg.delete().catch(() => {}), 3000);
          });
      } catch (err) {
        return message.reply(
          "[PERMS] Please check my permissions and that messages are not older than 14 days."
        );
      }
    }

    if (command === "leave") {
      const guildIdToLeave = args[0];
      const guildToLeave = asa.guilds.cache.get(guildIdToLeave);
      if (!guildToLeave) {
        return message.reply("[ERROR] Invalid server ID");
      }
      await guildToLeave.leave();
      return message.reply(`✅ Left server: ${guildToLeave.name}`);
    }

    if (command === "createjail") {
      if (!message.guild)
        return message.reply("[ERROR] Run this command in a server");
      const jailChannel = message.guild.channels.cache.find(
        (ch) => ch.name === "jail" && ch.type === 0
      );
      if (jailChannel) return message.reply("Jail already exists.");
      try {
        await message.guild.channels.create({
          name: "jail",
          type: 0,
          reason: "Channel for scammers and trash",
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone.id,
              deny: ["SendMessages"],
            },
          ],
        });
        return message.reply("Done");
      } catch (err) {
        return message.reply("[PERMS] Please check my permissions");
      }
    }
  });
}
