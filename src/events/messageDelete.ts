import { asa as asa } from "../index.ts";

const TARGET_GUILD_ID = "1365547135780786216";
const LOG_CHANNEL_ID = "1378001275446104085";

// message logger (on delete)

export default function onDel() {
    asa.on('messageDelete', async (message) => {
        const targetGuild = asa.guilds.cache.get(TARGET_GUILD_ID);
        const logChannel = targetGuild?.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel && logChannel.isTextBased()) {
            logChannel.send(`[🚮] [${message.guild}] from ${message.author}: ${message.content}`);
        }
    });
}