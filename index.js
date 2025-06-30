
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const channelMap = {
  seed: process.env.CHANNEL_SEED,
  gear: process.env.CHANNEL_GEAR,
  egg: process.env.CHANNEL_EGG,
  cosmetics: process.env.CHANNEL_COSMETICS,
  event: process.env.CHANNEL_EVENT
};

function formatItem(item) {
  return `**${item.display_name}**\n💰 ${item.price} ${item.currency}\n⭐ ${item.rarity}\n${item.description}\n`;
}

async function updateChannel(type, items) {
  const channelId = channelMap[type];
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId);
  if (!channel) return;

  // Supprimer les anciens messages
  const messages = await channel.messages.fetch({ limit: 10 });
  for (const message of messages.values()) await message.delete();

  if (!items || items.length === 0) {
    await channel.send("Aucun contenu pour le moment.");
    return;
  }

  let msg = `**Contenu ${type.toUpperCase()}**\n\n`;
  for (const item of items) msg += formatItem(item) + "\n";
  await channel.send(msg);
}

client.once("ready", () => {
  console.log("Bot en ligne");

  const user_id = "grow-a-garden-bot-" + Date.now(); // identifiant unique
  const ws = new WebSocket(`wss://websocket.joshlei.com/growagarden?user_id=${encodeURIComponent(user_id)}`);

  ws.on("open", () => console.log("WebSocket connecté"));
  ws.on("message", async (data) => {
    try {
      const stocks = JSON.parse(data.toString());

      for (const type of ["seed", "gear", "egg", "cosmetics", "event"]) {
        if (stocks[type]) {
          await updateChannel(type, stocks[type]);
        }
      }
    } catch (err) {
      console.error("Erreur de traitement WebSocket :", err);
    }
  });

  ws.on("error", (e) => console.error("WebSocket error:", e));
  ws.on("close", () => console.warn("WebSocket fermé"));
});

client.login(process.env.DISCORD_TOKEN);
