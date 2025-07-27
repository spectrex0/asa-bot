import Discord from "discord.js-selfbot-v13";
import "dotenv/config";

interface BotConfig {
  TOKEN: string;
  SERVER_ID: string;
  CHANNEL_ID: string;
  CHECK_INTERVAL: number;
  MEMBER_LIMIT: number;
}

function getConfig(prefix: string): BotConfig | null {
  const TOKEN = process.env[`${prefix}_TOKEN`];
  const SERVER_ID = process.env[`${prefix}_SERVER_ID`];
  const CHANNEL_ID = process.env[`${prefix}_CHANNEL_ID`];

  if (!TOKEN || !SERVER_ID || !CHANNEL_ID) {
    console.warn(`⚠️ Configuración incompleta para ${prefix}, omitiendo...`);
    return null;
  }

  const CHECK_INTERVAL = parseInt(process.env[`${prefix}_CHECK_INTERVAL`] || "180000");
  const MEMBER_LIMIT = parseInt(process.env[`${prefix}_MEMBER_LIMIT`] || "10");

  return {
    TOKEN,
    SERVER_ID,
    CHANNEL_ID,
    CHECK_INTERVAL: isNaN(CHECK_INTERVAL) ? 180000 : CHECK_INTERVAL,
    MEMBER_LIMIT: isNaN(MEMBER_LIMIT) ? 10 : MEMBER_LIMIT,
  };
}

async function logRecentMembers(client: Discord.Client, config: BotConfig): Promise<void> {
  try {
    const server = client.guilds.cache.get(config.SERVER_ID);
    if (!server) {
      console.error(`[${client.user?.tag || "Unknown"}] ❌ Server not found: ${config.SERVER_ID}`);
      return;
    }

    const logChannel = client.channels.cache.get(config.CHANNEL_ID);
    if (!logChannel || !("send" in logChannel)) {
      console.error(`[${client.user?.tag || "Unknown"}] ❌ Channel not found or not text-based: ${config.CHANNEL_ID}`);
      return;
    }

    const members = await server.members.fetch();
    const recentMembers = members
      .filter((m: Discord.GuildMember) => m.joinedTimestamp !== null)
      .sort((a: Discord.GuildMember, b: Discord.GuildMember) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0))
      .first(config.MEMBER_LIMIT);

    if (!recentMembers || recentMembers.length === 0) {
      console.log(`[${client.user?.tag}] 🟡 No recent members found.`);
      return;
    }

    const list = recentMembers
      .map((member: Discord.GuildMember) => {
        return (
          `**${member.user.tag}**\n` +
          `> 👤 Created: ${new Date(member.user.createdTimestamp).toLocaleString()}\n` +
          `> 📥 Joined: ${new Date(member.joinedTimestamp!).toLocaleString()}`
        );
      })
      .join("\n\n");

    await (logChannel as Discord.TextBasedChannel).send({
      content: `📋 **Last ${config.MEMBER_LIMIT} members to join ${server.name}**:\n\n${list}\n\n━━━━━━━━━━━━━━━━━━━━`
    });

    console.log(`✅ Sent recent member list for ${server.name}`);
  } catch (error) {
    console.error(`[${client.user?.tag || "Unknown"}] ❌ Error fetching members:`, error);
  }
}

export function startClient(config: BotConfig): void {
  const client = new Discord.Client();

  client.on("ready", () => {
    console.log(`✅ [${client.user?.tag}] Logged in successfully!`);
    logRecentMembers(client, config);
    setInterval(() => logRecentMembers(client, config), config.CHECK_INTERVAL);
  });

  client.login(config.TOKEN).catch((err: Error) => {
    console.error(`❌ Login failed for bot with token: ${config.TOKEN.slice(0, 12)}...`, err.message);
  });
}

// === Start all bots ===
const BOT_COUNT = 3;

for (let i = 1; i <= BOT_COUNT; i++) {
  const prefix = `BOT${i}`;
  const config = getConfig(prefix);
  if (config) startClient(config);
}
