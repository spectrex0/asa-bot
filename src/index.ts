import { log } from 'console'
import {ActivityType, Client, GatewayIntentBits} from 'discord.js'
import dotenv from 'dotenv' 
import node from "@elysiajs/node";
import Elysia from "elysia";
  
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Message, Guild } from 'discord.js';
import { fetch as httpFetch } from 'undici';
dotenv.config()
// Inicializa variables de entorno
dotenv.config();

// Cliente de Discord
export const asa = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
});

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

let scamRules: ScamRule[] = [];
const messageTimestamps = new Map<string, number[]>();
const serverOwners = new Map<string, string>(); // Dueños por servidor

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

// Cargar reglas de estafa
(async function loadScamRules() {
  try {
    const raw = await readFile(SCAM_RULES_PATH, 'utf-8');
    scamRules = JSON.parse(raw) as ScamRule[];
    console.log(`[INIT] Loaded ${scamRules.length} scam patterns`);
  } catch (err) {
    console.error('[INIT] Failed to load scamPatterns.json', err);
  }
})();

// Verifica si un mensaje es sospechoso
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

// Sistema de detección de spam/estafas
function aiBrain() {
  asa.on('messageCreate', async (message: Message) => {
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
    const OWNER_ID = serverOwners.get(guildId) || process.env.AUTHOR;

    if (!OWNER_ID) {
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
      await message.reply(`<@${OWNER_ID}>, suspicious message.\nCan I jail him? :>`);

      if (!('createMessageCollector' in message.channel)) return;

      const filter = (m: Message) =>
        m.author.id === OWNER_ID && ['yes', 'no'].includes(m.content.toLowerCase());

      const collector = (message.channel as any).createMessageCollector({ filter, time: 300_000 });

      collector.on('collect', async (m: Message) => {
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
          await message.reply(
            `⏰ Time's up – ${author.tag} jailed for safety.`
          );
        }
      });
    } catch (err) {
      console.error(`[error] processing ${author.tag}:`, err);
    }
  });
}

// Mandar a la cárcel
async function jailUser(guild: Guild, userId: string): Promise<void> {
  const roleName = 'Jail';
  let jailRole = guild.roles.cache.find((r) => r.name === roleName);
  if (!jailRole) {
    jailRole = await guild.roles.create({ name: roleName, reason: 'Role for suspicious users' });
  }
  const member = await guild.members.fetch(userId);
  await member.roles.set([jailRole]);
}

// Comandos de texto
asa.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();
  const guild = message.guild;

  if (!guild) {
    return message.reply('[ERROR]');
  }

  const guildId = guild.id;
  const currentOwner = serverOwners.get(guildId) || process.env.AUTHOR;

  if (command === 'setowner') {
    const userMention = args[0];
    const userId = userMention.replace(/\D/g, '');

    if (!userId) {
      return message.reply('❌ [ERROR 404] PLASE MENTION THE NEW OWNER');
    }

    serverOwners.set(guildId, userId);
    return message.reply(`✅ <@${userId}>`);
  }

  if (currentOwner !== process.env.AUTHOR) {
    return message.reply('❌ [ERROR] U DONT HAVE PERMISSIONS TO RUN THIS COMMAND');
  }

  if (command === 'guilds') {
    const guilds = asa.guilds.cache.map(g => `- ${g.name} (ID: ${g.id})`).join('\n');
    return message.reply(`[SERVERS]: ${asa.guilds.cache.size} \n${guilds}`);
  }

  if (command === 'leave') {
    const guildIdToLeave = args[0];
    const guildToLeave = asa.guilds.cache.get(guildIdToLeave);
    if (!guildToLeave) {
      return message.reply('❌ [ERROR] INVALID ID');
    }

    await guildToLeave.leave();
    return message.reply(`✅ ${guildToLeave.name}`);
  }

  if (command === 'invite') {
    const guildId = args[0];
    if (!guildId) {
      return message.reply('❌ [PLEASE PROVIDE A ID]');
    }

    const clientId = asa.user?.id;
    if (!clientId) return message.reply('[INTERNAL ERROR PLEASE CONTACT THE BOT DEVELOPER]');

    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot&guild_id=${guildId}`;
    await message.author.send(`🔗 Enlace para invitarme al servidor \`${guildId}\`:\n${inviteLink}`);
    await message.reply('✅ Revisa tus mensajes privados.');
  }
});

// Webserver básico
const server = new Elysia({ adapter: node() }).listen(3000);
server.get('/api', () => 'FAKE SERVER BTW');
log('[RUNNING] localhost port 3000');

// Iniciar bot
async function startBot() {
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