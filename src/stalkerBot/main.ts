const Discord = require('discord.js-selfbot-v13');
const configs = require('./config.json');

export default function startClient(config) {
    const client = new Discord.Client();

    async function logRecentMembers() {
        try {
            const server = client.guilds.cache.get(config.SERVER_ID);
            const logChannel = client.channels.cache.get(config.CHANNEL_ID);

            if (!server || !logChannel) {
                console.error(`[${client.user?.tag}] Server or channel not found.`);
                return;
            }

            const members = await server.members.fetch();
            const sortedMembers = members
                .filter(m => m.joinedTimestamp)
                .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp);

            const limit = typeof config.MEMBER_LIMIT === 'number' && config.MEMBER_LIMIT > 0
                ? config.MEMBER_LIMIT
                : 10;

            const recentMembers = sortedMembers.first(limit);

            if (recentMembers.length === 0) {
                console.log(`[${client.user.tag}] No recent members found.`);
                return;
            }

            const memberList = recentMembers.map(member => {
                return `**${member.user.tag}**\n` +
                    `> 👤 Account Created: ${new Date(member.user.createdTimestamp).toLocaleString()}\n` +
                    `> 📥 Joined Server: ${new Date(member.joinedTimestamp).toLocaleString()}`;
            }).join("\n\n");

            await logChannel.send({
                content: `📋 **Last ${limit} members who joined ${server.name}**:\n\n${memberList}\n\n----------------------------------------------------`
            });

        } catch (error) {
            console.error(`[${client.user?.tag || config.TOKEN}] Error fetching members:`, error);
        }
    }

    client.on('ready', () => {
        console.log(`✅ Logged in as ${client.user.tag}`);

        logRecentMembers(); // Run once on startup
        setInterval(logRecentMembers, config.CHECK_INTERVAL); // Run periodically
    });

    client.login(config.TOKEN).catch(err => {
        console.error(`❌ Login failed for token: ${config.TOKEN.slice(0, 10)}...`);
    });
}

// Launch a client for each config
configs.forEach(startClient);

