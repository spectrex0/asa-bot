 
import 'dotenv/config';
import Discord from 'discord.js-selfbot-v13';
function getConfig(prefix) {
 
  const TOKEN = process.env[`${prefix}_TOKEN`];
  const SERVER_ID = process.env[`${prefix}_SERVER_ID`];
  const CHANNEL_ID = process.env[`${prefix}_CHANNEL_ID`];

  if (!TOKEN || !SERVER_ID || !CHANNEL_ID) {
    console.warn(`⚠️  Configuración incompleta para ${prefix}, omitiendo...`);
    return null;
  }

  return {
    TOKEN,
    SERVER_ID,
    CHANNEL_ID,
    CHECK_INTERVAL: parseInt(process.env[`${prefix}_CHECK_INTERVAL`]) || 180000,
    MEMBER_LIMIT: parseInt(process.env[`${prefix}_MEMBER_LIMIT`]) || 10,
  };
}
 
async function logRecentMembers(client, config) {
  try {
    const server = client.guilds.cache.get(config.SERVER_ID);
    const logChannel = client.channels.cache.get(config.CHANNEL_ID);

    if (!server) {
      console.error(`[${client.user?.tag || 'Unknown'}] ❌ Server not found (ID: ${config.SERVER_ID})`);
      return;
    }

    if (!logChannel) {
      console.error(`[${client.user?.tag || 'Unknown'}] ❌ Channel not found (ID: ${config.CHANNEL_ID})`);
      return;
    }

    const members = await server.members.fetch();
    const recent = members
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
      .first(config.MEMBER_LIMIT);

    if (recent.size === 0) {
      console.log(`[${client.user.tag}] 🟡 No recent members found.`);
      return;
    }

    const list = recent.map(member => {
      return `**${member.user.tag}**\n` +
        `> 👤 Created: ${new Date(member.user.createdTimestamp).toLocaleString()}\n` +
        `> 📥 Joined: ${new Date(member.joinedTimestamp).toLocaleString()}`;
    }).join("\n\n");

    await logChannel.send({
      content: `📋 **Last ${config.MEMBER_LIMIT} members to join ${server.name}**:\n\n${list}\n\n━━━━━━━━━━━━━━━━━━━━`
    });

    console.log(`✅ Sent member list for ${server.name}`);
  } catch (error) {
    console.error(`[${client.user?.tag || 'Unknown'}] ❌ Error fetching members:`, error);
  }
}


function startClient(config) {
  const client = new Discord.Client();

  client.on('ready', () => {
    console.log(`✅ [${client.user.tag}] Logged in successfully!`);
    logRecentMembers(client, config);
    setInterval(() => logRecentMembers(client, config), config.CHECK_INTERVAL);
  });

  client.login(config.TOKEN).catch(err => {
    console.error(`❌ Login failed for bot with token: ${config.TOKEN.slice(0, 12)}...`);
  });
}

const BOT_COUNT = 3;  

for (let i = 1; i <= BOT_COUNT; i++) {
  const prefix = `BOT${i}`;
  const config = getConfig(prefix);
  if (config) startClient(config);
}

export default startClient