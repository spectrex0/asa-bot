import asa from '..';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { systemPrompt } from './settings';
import type { Message, Guild } from 'discord.js';
import { fetch as httpFetch } from 'undici';

interface ScamRule {
  pattern: string;
  content: string;
}

const SCAM_RULES_PATH = join(__dirname, 'scamPatterns.json');
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MIN_SCAM_LENGTH = 15;
const SPAM_LIMIT = 5;
const SPAM_INTERVAL = 10_000;

let scamRules: ScamRule[] = [];
const messageTimestamps = new Map<string, number[]>();

(async function loadScamRules() {
  try {
    const raw = await readFile(SCAM_RULES_PATH, 'utf-8');
    scamRules = JSON.parse(raw) as ScamRule[];
    console.log(`[init] Loaded ${scamRules.length} scam patterns`);
  } catch (err) {
    console.error('[init] Failed to load scamPatterns.json', err);
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

  let text: string;
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

    text = await res.text();
  } catch (err) {
    console.error('[isScam] Network or parse error:', err);
    return false;
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error('[isScam] Failed to parse Gemini response:', err);
    return false;
  }

  const reply: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'NO';
  return reply.trim().toUpperCase() === 'YES';
}

export default function aiBrain(): void {
  asa.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const author = message.author;
    const guild = message.guild;

    console.log(`[msg] ${author.tag}: "${content}"`);

    if (content.toLowerCase() === 'asa who are u?') {
      await message.reply("I'm top 2 scammers hater.");
      return;
    }

    // Anti-spam
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

    const OWNER_ID = process.env.AUTHOR;
    if (!OWNER_ID) {
      console.warn('[warn] AUTHOR env var missing – cannot notify');
      return;
    }

    try {
      // Local rules
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

      // Heuristic for remote check
      const suspectTokens = /(http|www\.|\.com|telegram|\$\d|\+\d{5})/i;
      const remoteFlag = !localFlag && suspectTokens.test(content)
        ? await isScam(content)
        : false;

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
          await message.reply(`⏰ Time's up (Tokyo didn't reply in 5 mins) — ${author.tag} jailed for safety.`);
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
