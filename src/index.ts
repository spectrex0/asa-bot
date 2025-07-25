import cors from "@elysiajs/cors";
import node from "@elysiajs/node";
import { log } from "console";
import sendRequest from "./events/sendRequest.ts";
import type { Message as DiscordMessage } from "discord.js";
import {
  ActivityType,
  Client,
  DiscordAPIError,
  GatewayIntentBits,
  Guild,
} from "discord.js";
import dotenv from "dotenv";
import Elysia from "elysia";
import { readFile } from "fs/promises";
import { join } from "path";
import { fetch as httpFetch } from "undici";
import Commands from "./commands/commands.ts";
import onDel from "./events/messageDelete.ts";
import { systemPrompt } from "./prompt.ts";
import ask from "./ask.ts";
import startClient from "./stalkerBot/main.ts";
dotenv.config();

export const asa = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
});

const SCAM_RULES_PATH = join(__dirname, "scamPatterns.json");
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MIN_SCAM_LENGTH = 15;
const SPAM_LIMIT = 4;
const SPAM_INTERVAL = 5_000;

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
    const raw = await readFile(SCAM_RULES_PATH, "utf-8");
    scamRules = JSON.parse(raw) as ScamRule[];
    console.log(`[INIT] Loaded ${scamRules.length} scam patterns`);
  } catch (err) {
    console.error("[INIT] Failed to load scamPatterns.json", err);
  }
})();

async function isScam(message: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[isScam] GEMINI_API_KEY env var missing");
    return false;
  }

  const prompt = systemPrompt + "\n knowing that u need to verify this: \n" + message;
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  try {
    const res = await httpFetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      console.error(
        `[isScam] API error: ${res.status} ${res.statusText}`
      );
      return false;
    }

    const data = (await res.json()) as GeminiResponse;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No";
    return reply.trim().toUpperCase() === "YES";
  } catch (err) {
    console.error("[isScam] Request failed:", err);
    return false;
  }
}

function aiBrain() {
  asa.on("messageCreate", async (message: DiscordMessage) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    const author = message.author;
    const guild = message.guild;

    if (content.toLowerCase() === "asa who are u?" && process.env.AUTHOR) {
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

    let localFlag = false;
    let matchedPattern = "";

    for (const r of scamRules) {
      const regex = new RegExp(r.pattern, "i");
      if (regex.test(content)) {
        localFlag = true;
        matchedPattern = r.pattern;
        break;
      }
    }

    const remoteFlag =
      !localFlag && content.length >= MIN_SCAM_LENGTH
        ? await isScam(content)
        : false;
    const flagged = localFlag || remoteFlag;

    if (!flagged) return;

    console.log(
      `[SCAM] ${author.tag} – rule: ${
        matchedPattern || (remoteFlag ? "asa" : "n/a")
      }`
    );

    await message.react("⚠️");
    setTimeout(() => {
      message.delete(); //  delete message if is detected as scam
    }, 4000);

    // await message.reply(`<@${author.id}> that was really stupid 💀`);
    await jailUser(guild, author.id);
  });
}

async function jailUser(guild: Guild, userId: string): Promise<void> {
  const roleName = "Jail";
  let jailRole = guild.roles.cache.find((r) => r.name === roleName);

  if (!jailRole) {
    try {
      jailRole = await guild.roles.create({
        name: roleName,
        reason: "Role for suspicious users",
      });
    } catch (err) {
      console.error("[ERROR] Could not create Jail role", err);
      return;
    }
  }

  try {
    const member = await guild.members.fetch(userId);
    await member.roles.set([jailRole]);
    console.log(`[JAIL] Successfully jailed user: ${member.user.tag}`);
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      console.error(`[JAIL] Discord API Error: ${err.message}`);
    } else {
      console.error(`[JAIL] Unexpected error:`, err);
    }
  }
}

const server = new Elysia({ adapter: node() }).listen(3000);
server.get("/api", () => ({
  message: "👨‍💻",
}));
server.use(cors());
log("[BACKEND] port 3000");

async function startBot() {
  aiBrain();
  onDel()
  Commands();
  ask()
  startClient
  sendRequest() 
  asa.once("ready", () => {
    // const guildCount = asa.guilds.cache.size;
    asa.user?.setStatus("online");
    asa.user?.setActivity({
      name: `with TypeScript`,
      type: ActivityType.Playing,
    });
    log("[ONLINE] Anti Tash ppl / Scam Agent", asa.user?.username);
  });

  await asa.login(process.env.TOKEN);
}

startBot();
export default asa;
setInterval(async () => {
  try {
    const res = await fetch('https://bumprs.onrender.com/api'); 
    const data = await res.json();
    console.log(data)
  } catch (err) {
    
  }
}, 300000);
