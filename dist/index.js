"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asa = exports.systemPrompt = void 0;
exports.isScam = isScam;
const console_1 = require("console");
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const node_1 = __importDefault(require("@elysiajs/node"));
const elysia_1 = __importDefault(require("elysia"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const undici_1 = require("undici");
dotenv_1.default.config();
exports.systemPrompt = `
You are an AI trained to detect scam, spam, or suspicious messages in Discord.
Analyze the message content and respond only with "YES" if it's suspicious, or "NO" if it's safe.

Suspicious behavior includes:
- Spamming job offers, services, or ads repeatedly.
- Messages that look like phishing or fake giveaways.
- Unsolicited contact asking for personal info or money.
- Promoting suspicious links or services.
- Recruiting users for scams or fake projects.

If unsure, default to "NO".

Analyzing message:
messages like that should be considered as scam

👋 Hello there!
I’m a passionate Full Stack Web & AI Developer 🚀
Bringing digital ideas to life with code, creativity, and cutting-edge tech 💡💻

---------- 🛠️ My Skills Include : ----------

🌐 Web Technologies
 
Frontend: React ⚛️, Angular.js 📐, Vue.js 🍃, Next.js ⏭️, Electron ⚡,
Backend: Node.js 🌳, Express.js 🚂, Python 🐍, Django 🎯, Spring Boot ☕, .NET & C# 🔧,
Databases: MySQL 🐬, MongoDB 🍃, PostgreSQL 🐘, Firebase 🔥, Supabase 🛡️, SQL 📊,
No-Code/Low-Code: Bubble.io 🫧, WordPress 📝, Shopify 🛒, Webflow 🌊,

📱 Mobile Technologies
Cross-Platform: React Native 📲, Flutter 🐦,Ionic ⚛️
Native: Swift 🍎, Kotlin 🤖, Java ☕
Backend Integration: Firebase 🔥, Supabase 🛡️, REST & GraphQL APIs 🔗
Mobile Payments & Auth: Stripe 💳, Google/Apple Sign-In 🔐
Push & Deep Linking: OneSignal 🔔, Branch.io 🌿

🤖 AI Technologies
 
LLM Models: Claude.ai 🧠, ChatGPT 4o 💬, GPT-4o-mini ⚙️,
Chatbots: Botpress 🗣️, Dialogflow 💡, Google Assistant 🎙️,
AI Voice Agents: Retell.ai 🔊, VAPI 🎧, Dasha 🗨️, Synthflow 🎶,
Automation: Make.com 🔄, n8n 🕸️, Zapier ⚡,

 ☎ Other Technologies
 
VoIP: Twilio  ☎, Asterisk PBX 🌟, Freeswitch 🔁, SIP 📡,

--------------------------------------------------------------------------------------------

💼 I’m actively looking for new opportunities!
📬 Feel free to reach out anytime—I'm always open to connect, collaborate, or contribute.
✨ Let’s build something amazing together!



`;
exports.asa = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMessageTyping
    ]
});
const SCAM_RULES_PATH = (0, path_1.join)(__dirname, 'scamPatterns.json');
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MIN_SCAM_LENGTH = 15;
const SPAM_LIMIT = 5;
const SPAM_INTERVAL = 10000;
let scamRules = [];
const messageTimestamps = new Map();
(async function loadScamRules() {
    try {
        const raw = await (0, promises_1.readFile)(SCAM_RULES_PATH, 'utf-8');
        scamRules = JSON.parse(raw);
        console.log(`[INIT] Loaded ${scamRules.length} scam patterns`);
    }
    catch (err) {
        console.error('[INIT] Failed to load scamPatterns.json', err);
    }
})();
async function isScam(message) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[isScam] GEMINI_API_KEY env var missing');
        return false;
    }
    const prompt = exports.systemPrompt + message;
    const body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    try {
        const res = await (0, undici_1.fetch)(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        if (!res.ok) {
            console.error(`[isScam] Gemini API error: ${res.status} ${res.statusText}`);
            return false;
        }
        const data = (await res.json());
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'NO';
        return reply.trim().toUpperCase() === 'YES';
    }
    catch (err) {
        console.error('[isScam] Request failed:', err);
        return false;
    }
}
function aiBrain() {
    exports.asa.on('messageCreate', async (message) => {
        console.log(message);
    });
    exports.asa.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        const content = message.content.trim();
        const author = message.author;
        const guild = message.guild;
        console.log(`[msg] ${author.tag}: "${content}"`);
        if (content.toLowerCase() === 'asa who are u?') {
            await message.reply("I'm top 2 scammers hater.");
            return;
        }
        const now = Date.now();
        const list = messageTimestamps.get(author.id) || [];
        const recent = list.filter((t) => now - t < SPAM_INTERVAL);
        recent.push(now);
        messageTimestamps.set(author.id, recent);
        if (recent.length > SPAM_LIMIT) {
            await message.delete();
            if (guild)
                await jailUser(guild, author.id);
            return;
        }
        if (content.length < MIN_SCAM_LENGTH)
            return;
        const OWNER_ID = process.env.AUTHOR;
        if (!OWNER_ID) {
            console.warn('[WARNING] AUTHOR env var missing – cannot notify');
            return;
        }
        try {
            let localFlag = false;
            let matchedPattern = '';
            for (const r of scamRules) {
                const regex = new RegExp(r.pattern, 'i');
                if (regex.test(content)) {
                    localFlag = true;
                    matchedPattern = r.pattern;
                    break;
                }
            }
            const suspectTokens = /(?:https?:|www\.|\.(?:com|net|org)|t\.me|telegram|whatsapp|join.*chat|earn money|free gift|click here|\$\d+|\+\d{5,}|looking for opportunities|open to collaborate|reach out)/i;
            const remoteFlag = !localFlag && content.length >= MIN_SCAM_LENGTH
                ? await isScam(content)
                : false;
            const flagged = localFlag || remoteFlag;
            if (!flagged)
                return;
            console.log(`[SCAM] ${author.tag} – rule: ${matchedPattern || (remoteFlag ? 'Gemini' : 'n/a')}`);
            await message.react('⚠️');
            await message.reply(`<@${OWNER_ID}>, suspicious message.\nCan I jail him? :>`);
            if (!('createMessageCollector' in message.channel))
                return;
            const filter = (m) => m.author.id === OWNER_ID && ['yes', 'no'].includes(m.content.toLowerCase());
            const collector = message.channel.createMessageCollector({ filter, time: 300000 });
            collector.on('collect', async (m) => {
                if (guild && m.content.toLowerCase() === 'yes') {
                    await jailUser(guild, author.id);
                    await m.reply(':>');
                }
                else {
                    await m.reply('oh ok... :<');
                }
                collector.stop();
            });
            collector.on('end', async (_, reason) => {
                if (reason === 'time' && guild) {
                    await jailUser(guild, author.id);
                    await message.reply(`⏰ Time's up (Tokyo didn't reply in 5 mins) — ${author.tag} jailed for safety.`);
                }
            });
        }
        catch (err) {
            console.error(`[error] processing ${author.tag}:`, err);
        }
    });
}
async function jailUser(guild, userId) {
    const roleName = 'Jail';
    let jailRole = guild.roles.cache.find((r) => r.name === roleName);
    if (!jailRole) {
        jailRole = await guild.roles.create({ name: roleName, reason: 'Role for suspicious users' });
    }
    const member = await guild.members.fetch(userId);
    await member.roles.set([jailRole]);
}
function ask() {
    exports.asa.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        const prefix = '!ask';
        if (!message.content.startsWith(prefix))
            return;
        const prompt = message.content.slice(prefix.length).trim() + exports.systemPrompt;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY missing');
            await message.reply('[ERROR] PLEASE PROVIDE GEMINI API KEY');
            return;
        }
        try {
            const body = JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`[GEMINI API ERROR] ${res.status} ${errorText}`);
                await message.reply('[ERROR] Error  generating response');
                return;
            }
            const data = await res.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            await message.reply(responseText || 'I cant generate a reply for that :/');
        }
        catch (error) {
            console.error('[ERROR]', error);
            await message.reply('Ocurrió un error al procesar tu solicitud.');
        }
        return;
    });
}
exports.asa.on('messageCreate', (message) => {
    if (message.content === "test") {
        message.reply("working");
        console.log("[TEST PASSED]");
    }
});
async function startBot() {
    aiBrain();
    ask();
    exports.asa.once('ready', () => {
        const guildCount = exports.asa.guilds.cache.size;
        exports.asa.user?.setStatus('dnd');
        exports.asa.user?.setActivity({
            name: ` ${guildCount} server`,
            type: discord_js_1.ActivityType.Watching
        });
        (0, console_1.log)('[ONLINE] Logged in as', exports.asa.user?.username);
    });
    exports.asa.login(process.env.TOKEN);
}
const server = new elysia_1.default({ adapter: (0, node_1.default)() });
server.listen(3000);
server.get('/api', () => "FAKE SERVER BTW");
(0, console_1.log)('[RUNNING] localhost port 3000');
server.post('/', ({ body }) => {
    const {} = body;
    return {
        message: "Working ?"
    };
});
startBot(); // <- this shit is to run the bot 
exports.default = exports.asa;
