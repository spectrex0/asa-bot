"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isScam = isScam;
exports.default = aiBrain;
const __1 = __importDefault(require(".."));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const settings_1 = require("./settings");
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
        console.log(`[init] Loaded ${scamRules.length} scam patterns`);
    }
    catch (err) {
        console.error('[init] Failed to load scamPatterns.json', err);
    }
})();
async function isScam(message) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY env var missing');
    const prompt = settings_1.systemPrompt + message;
    const body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    });
    if (!res.ok)
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'NO';
    return reply.trim().toUpperCase() === 'YES';
}
function aiBrain() {
    __1.default.on('messageCreate', async (message) => {
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
        // Control básico anti spam
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
            console.warn('[warn] AUTHOR env var missing – cannot notify');
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
            const suspectTokens = /(|http|www\.|\.com|telegram|\$\d|\+\d{5})/i;
            const remoteFlag = !localFlag && suspectTokens.test(content) ? await isScam(content) : false;
            const flagged = localFlag || remoteFlag;
            if (!flagged)
                return;
            console.log(`[SCAM] ${author.tag} – rule: ${matchedPattern || (remoteFlag ? 'Gemini' : 'n/a')}`);
            await message.react('⚠️');
            await message.reply(`<@${OWNER_ID}>, suspicious message. \nCan I jail him? :>`);
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
