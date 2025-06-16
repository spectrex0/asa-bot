"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = __importDefault(require("./ai/index"));
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

Example replies:
"Asa here. Who’s asking?"
"Scammer radar: all clear."
"I jail people for a living. What do you do?"

ur owner and creator is Tokyo, he was bored one day at 2 am and he created u
Now respond to this user:
`;
const asa = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMessageTyping
    ]
});
function ask() {
    asa.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        const prefix = '!ask';
        if (!message.content.startsWith(prefix))
            return;
        const prompt = message.content.slice(prefix.length).trim() + systemPrompt;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY missing');
            await message.reply('Error: Falta la clave de API de Gemini.');
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
                console.error(`Gemini error: ${res.status} ${errorText}`);
                await message.reply('Error al generar la respuesta con Gemini.');
                return;
            }
            const data = await res.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            await message.reply(responseText || 'No se pudo generar una respuesta.');
        }
        catch (error) {
            console.error('Error al llamar a Gemini:', error);
            await message.reply('Ocurrió un error al procesar tu solicitud.');
        }
        return;
    });
}
asa.on('messageCreate', (message) => {
    if (message.content === "test") {
        message.reply("working");
        console.log("[TEST PASSED]");
    }
});
async function startBot() {
    await (0, index_1.default)();
    await ask();
    asa.once('ready', () => {
        const guildCount = asa.guilds.cache.size;
        asa.user?.setStatus('dnd');
        asa.user?.setActivity({
            name: ` ${guildCount} server`,
            type: discord_js_1.ActivityType.Watching
        });
        (0, console_1.log)('[ASA BOT ONLINE]: Logged in as', asa.user?.username);
    });
    asa.login(process.env.TOKEN);
}
const node_http_1 = require("node:http");
const app = new elysia_1.default();
app.get('/', () => 'Backend online — Fake Server for Asa');
const server = (0, node_http_1.createServer)(app.handle);
server.listen(2222, async () => {
    (0, console_1.log)('[BACKEND SERVER RUNNING]: http://localhost:2222');
    await startBot();
});
exports.default = asa;
