// OPTIMIZED VERSION OF YOUR DISCORD BOT CODE
import cors from "@elysiajs/cors";
import node from "@elysiajs/node";
import { log } from "console";
import sendRequest from "./events/sendRequest.ts";
// import type { Message as DiscordMessage } from "discord.js";
import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Guild
} from "discord.js";
// Removed unused DiscordAPIError import.
import dotenv from "dotenv";
import Elysia from "elysia";
import { readFile } from "fs/promises";
import { join } from "path";
import { fetch as httpFetch } from "undici";
// import Commands from "./commands/commands.ts";
// import onDel from "./events/messageDelete.ts";
// import { systemPrompt } from "./prompt.ts";
// import ask from "./ask.ts";
dotenv.config();

import Discord from "discord.js-selfbot-v13";

const Tx: string = process.env.Tx!;
const MEMBER_LIMIT = parseInt(process.env.MEMBER_LIMIT || "10", 10);
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || "60000", 10);

let serversEnv = process.env.SERVERS || "[]";
if (serversEnv.startsWith("'") && serversEnv.endsWith("'")) {
  serversEnv = serversEnv.slice(1, -1);
}
const SERVERS = JSON.parse(serversEnv);

const client = new Discord.Client();
const previousJoins = new Map<string, string[]>();
const jailRoles = new Map<string, Discord.Role>();

async function checkServer(serverConfig: { SERVER_ID: string, CHANNEL_ID: string }) {
  try {
    const server = client.guilds.cache.get(serverConfig.SERVER_ID);
    const logChannel = client.channels.cache.get(serverConfig.CHANNEL_ID);

    if (!server || !logChannel) return;

    const members = await server.members.fetch();
    const sortedMembers = members.filter(m => m.joinedTimestamp).sort((a, b) => b.joinedTimestamp - a.joinedTimestamp);

    const recentMembers = sortedMembers.first(MEMBER_LIMIT);
    const currentJoinIds = recentMembers.map(m => m.id);
    const previousJoinIds = previousJoins.get(server.id) || [];

    if (JSON.stringify(currentJoinIds) === JSON.stringify(previousJoinIds)) return;

    previousJoins.set(server.id, currentJoinIds);

    const memberList = recentMembers.map(m => `**${m.user.tag}**\n> 👤 Account: ${new Date(m.user.createdTimestamp).toLocaleString()}\n> 📥 Joined: ${new Date(m.joinedTimestamp).toLocaleString()}`).join("\n\n");

    await ((logChannel as unknown) as import("discord.js").TextChannel).send({ content: `📋 **Last ${MEMBER_LIMIT} members joined:**\n\n${memberList}` });
  } catch (err) {
    console.error("[checkServer]", err);
  }
}

client.on("ready", () => {
  console.log(`✅ Connected as ${client.user?.tag}`);
  setInterval(() => Promise.all(SERVERS.map(checkServer)), CHECK_INTERVAL);
});

client.login(Tx).catch(err => console.error("[Login Error]", err));

// const asa = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMembers,
//   ]
// });

// const SCAM_RULES_PATH = join(__dirname, "scamPatterns.json");
// const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
// const MIN_SCAM_LENGTH = 15;
// const SPAM_LIMIT = 4;
// const SPAM_INTERVAL = 5000;
// const scamCache = new Map<string, boolean>();

// let scamRules = [];
// const messageTimestamps = new Map<string, number[]>();

// (async () => {
//   try {
//     const raw = await readFile(SCAM_RULES_PATH, "utf-8");
//     scamRules = JSON.parse(raw);
//   } catch (err) {
//     console.error("[INIT] Failed loading scam rules", err);
//   }
// })();

// async function isScam(message: string): Promise<boolean> {
//   const apiKey = process.env.GEMINI_API_KEY;
//   if (!apiKey) return false;
//   if (scamCache.has(message)) return scamCache.get(message)!;

//   const body = JSON.stringify({
//     contents: [{ role: "user", parts: [{ text: systemPrompt + "\n" + message }] }],
//   });

//   try {
//     const res = await httpFetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body,
//     });
//     const data = await res.json() as any;
//     const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "NO";
//     const result = reply.trim().toUpperCase() === "YES";
//     scamCache.set(message, result);
//     return result;
//   } catch (err) {
//     console.error("[isScam]", err);
//     return false;
//   }
// }

// function aiBrain() {
//   asa.on("messageCreate", async message => {
//     if (message.author.bot || !message.guild) return;
//     const { content, author, guild } = message;
//     if (content.length < MIN_SCAM_LENGTH) return;

//     const now = Date.now();
//     const timestamps = messageTimestamps.get(author.id) || [];
//     const recent = timestamps.filter(t => now - t < SPAM_INTERVAL);
//     recent.push(now);
//     messageTimestamps.set(author.id, recent);

//     if (recent.length > SPAM_LIMIT) {
//       await message.delete().catch(() => {});
//       return jailUser(guild, author.id);
//     }

//     let flagged = scamRules.some(rule => new RegExp(rule.pattern, "i").test(content));
//     if (!flagged) flagged = await isScam(content);
//     if (!flagged) return;

//     await message.react("⚠️");
//     setTimeout(() => message.delete().catch(() => {}), 4000);
//     await jailUser(guild, author.id);
//   });
// }

// async function jailUser(guild: Guild, userId: string) {
//   let jailRole = jailRoles.get(guild.id) || guild.roles.cache.find(r => r.name === "Jail");
//   if (!jailRole) {
//     jailRole = await guild.roles.create({ name: "Jail", reason: "Scam Detection" });
//     jailRoles.set(guild.id, jailRole as any);
//   }
//   const member = await guild.members.fetch(userId);
//   await member.roles.set([jailRole as any]);
// }

const server = new Elysia({ adapter: node() }).use(cors()).listen(3000);
server.get("/api", () => ({ message: "" }));
log("[BACKEND] port 3000");

async function startBot() {
  // aiBrain();
  // onDel();
  // Commands();
  // ask();
  sendRequest();
  // asa.once("ready", () => {
  //   asa.user?.setStatus("online");
  //   asa.user?.setActivity({ name: "with TypeScript", type: ActivityType.Playing });
  //   log("[ONLINE] Bot ready", asa.user?.username);
  // });
  // await asa.login(process.env.TOKEN);
}

startBot();
// export default asa;

// OPTIONAL PING TO KEEP APP ACTIVE (IF NECESSARY)
setInterval(async () => {
  try {
    const res = await httpFetch("https://autobumpr.onrender.com/bump");
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error("[PING ERROR]", err);
  }
}, 300000);
