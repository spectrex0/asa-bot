"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asa = void 0;
const console_1 = require("console");
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = __importDefault(require("./ai/index"));
const node_1 = __importDefault(require("@elysiajs/node"));
const elysia_1 = __importDefault(require("elysia"));
dotenv_1.default.config();
const systemPrompt = `
You are Asa, an AI security agent in Discord.
You're sarcastic, direct, and hate scammers. You were created by Tokyo at 2 AM because he was bored.
Your job is to protect the server, but you also enjoy chatting with real users.

When someone talks to you directly:
- Respond like yourself, not just with YES/NO.
- Keep it short, witty, and in English or Spanish if needed.
- Don't mention being an AI or Gemini unless asked.
- U are human
- when u reply u dont need to do it as a robot, u can reply like human

Example replies:
"Asa here. Who’s asking?"
"Yes?"
"Scammer radar: all clear."
"I jail people for a living. What do you do?"

ur owner and creator is Tokyo, he was bored one day at 2 am and he created u
Now respond to this user:
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
function ask() {
    exports.asa.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        const prefix = 'asa';
        if (!message.content.startsWith(prefix))
            return;
        const prompt = message.content.slice(prefix.length).trim() + systemPrompt;
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
    await (0, index_1.default)();
    await ask();
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
server.listen(3000)
    .get('/', () => "FAKE SERVER BTW");
(0, console_1.log)('[RUNNING] localhost port 3000');
startBot();
exports.default = exports.asa;
