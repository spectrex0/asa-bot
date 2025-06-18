import { log } from 'console';
import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Guild,
} from 'discord.js';
import dotenv from 'dotenv';
import node from '@elysiajs/node';
import Elysia from 'elysia';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import cors from '@elysiajs/cors';
import type { Message as DiscordMessage } from 'discord.js';
import { fetch as httpFetch } from 'undici';

// Cargar variables de entorno
dotenv.config();

// Inicializar cliente de Discord
export const asa = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
});

// Ruta del archivo donde se guardan los dueños por servidor
const OWNERS_FILE = join(__dirname, 'owners.json');

// Map local para almacenar los dueños por servidor
let serverOwners = new Map<string, string>();

// Tu ID (único usuario autorizado a usar los comandos)
const OWNER_ID = process.env.AUTHOR || '852949329320345620'; // Reemplaza con tu ID real

// Cargar dueños desde owners.json
async function loadOwners(): Promise<void> {
  try {
    const data = await readFile(OWNERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    serverOwners = new Map(Object.entries(parsed));
  } catch (err) {
    console.warn('[INFO] No se encontró owners.json. Creando uno nuevo.');
    await saveOwners();
  }
}

// Guardar dueños en owners.json
async function saveOwners(): Promise<void> {
  const obj = Object.fromEntries(serverOwners);
  await writeFile(OWNERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
}

// Prompt de IA
export const systemPrompt = `
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

// Configuración inicial
const SCAM_RULES_PATH = join(__dirname, 'scamPatterns.json');
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`; 
const MIN_SCAM_LENGTH = 15;
const SPAM_LIMIT = 5;
const SPAM_INTERVAL = 10_000;

interface ScamRule {
  pattern: string;
  content: string;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

let scamRules: ScamRule[] = [];
const messageTimestamps = new Map<string, number[]>();

(async function loadScamRules() {
  try {
    const raw = await readFile(SCAM_RULES_PATH, 'utf-8');
    scamRules = JSON.parse(raw) as ScamRule[];
    console.log(`[INIT] Loaded ${scamRules.length} scam patterns`);
  } catch (err) {
    console.error('[INIT] Failed to load scamPatterns.json', err);
  }
})();

export async function isScam(message: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[isScam] GEMINI_API_KEY env var missing');
    return false;
  }

  const prompt = systemPrompt + message;
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  try {
    const res = await httpFetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      console.error(`[isScam] Gemini API error: ${res.status} ${res.statusText}`);
      return false;
    }

    const data = (await res.json()) as GeminiResponse;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'NO';
    return reply.trim().toUpperCase() === 'YES';
  } catch (err) {
    console.error('[isScam] Request failed:', err);
    return false;
  }
}

function aiBrain() {
  asa.on('messageCreate', async (message: DiscordMessage) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    const author = message.author;
    const guild = message.guild;

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
      if (guild) await jailUser(guild, author.id);
      return;
    }

    if (content.length < MIN_SCAM_LENGTH) return;

    const guildId = guild.id;
    const currentOwner = serverOwners.get(guildId);

    if (!currentOwner) {
      console.warn(`[WARNING] No owner set for guild: ${guildId}`);
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

      const remoteFlag = !localFlag && content.length >= MIN_SCAM_LENGTH ? await isScam(content) : false;
      const flagged = localFlag || remoteFlag;

      if (!flagged) return;

      console.log(`[SCAM] ${author.tag} – rule: ${matchedPattern || (remoteFlag ? 'Gemini' : 'n/a')}`);
      await message.react('⚠️');
      await message.reply(`<@${currentOwner}>, suspicious message.\nCan I jail him? :>`);

      if (!('createMessageCollector' in message.channel)) return;

      const filter = (m: DiscordMessage) =>
        m.author.id === currentOwner && ['yes', 'no'].includes(m.content.toLowerCase());

      const collector = (message.channel as any).createMessageCollector({ filter, time: 300_000 });

      collector.on('collect', async (m: DiscordMessage) => {
        if (guild && m.content.toLowerCase() === 'yes') {
          await jailUser(guild, author.id);
          await m.reply(':>');
        } else {
          await m.reply('oh ok... :<');
        }
        collector.stop();
      });

      collector.on('end', async (_: any, reason: string) => {
        if (reason === 'time' && guild) {
          await jailUser(guild, author.id);
          await message.reply(`⏰ Time's up – ${author.tag} jailed for safety.`);
        }
      });
    } catch (err) {
      console.error(`[error] processing ${author.tag}:`, err);
    }
  });
}

async function jailUser(guild: Guild, userId: string): Promise<void> {
  const roleName = 'Jail';
  let jailRole = guild.roles.cache.find((r) => r.name === roleName);
  if (!jailRole) {
    jailRole = await guild.roles.create({ name: roleName, reason: 'Role for suspicious users' });
  }
  const member = await guild.members.fetch(userId);
  await member.roles.set([jailRole]);
}

asa.on('messageCreate', async (message: DiscordMessage) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();
  const guild = message.guild;

  if (!guild) {
    return message.reply('[ERROR]');
  }

  const guildId = guild.id;

  if (message.author.id !== OWNER_ID) {
    return message.reply('[ERROR CODE 8551]: Insufficient permissions');
  }

  if (command === 'setowner') {
    const userMention = args[0];
    const userId = userMention.replace(/\D/g, ''); 

    if (!userId) {
      return message.reply('[ERROR 404] Please mention a valid user');
    }

    serverOwners.set(guildId, userId);
    await saveOwners();
    return message.reply(`✅ Owner set: <@${userId}>`);
  }

  if (command === 'guilds') {
    const guilds = asa.guilds.cache.map(g => `- ${g.name} (ID: ${g.id})`).join('\n');
    return message.reply(`[SERVERS]: ${asa.guilds.cache.size}\n${guilds}`);
  }

  if (command === 'leave') {
    const guildIdToLeave = args[0];
    const guildToLeave = asa.guilds.cache.get(guildIdToLeave);
    if (!guildToLeave) {
      return message.reply('[ERROR] Invalid server ID');
    }

    await guildToLeave.leave();
    return message.reply(`✅ Left server: ${guildToLeave.name}`);
  }

});
 
const server = new Elysia({ adapter: node() }).listen(3000);
server.get('/api', () => {
  return{
    message: "Fake backend running "
  }
});

server.use(
    cors({
      origin: ["https://codersresources.vercel.app"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: false,
    })
  )
log('[RUNNING] localhost port 3000');

async function startBot() {
  await loadOwners();
  aiBrain();

  asa.once('ready', () => {
    const guildCount = asa.guilds.cache.size;
    asa.user?.setStatus('dnd');
    asa.user?.setActivity({
      name: ` ${guildCount} server`,
      type: ActivityType.Watching,
    });
    log('[ONLINE] Logged in as', asa.user?.username);
  });

  await asa.login(process.env.TOKEN);
}

startBot();

export default asa