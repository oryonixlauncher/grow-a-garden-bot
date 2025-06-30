const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const WebSocket = require("ws");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Token bot stocké en variable d'environnement
const USER_ID = process.env.USER_ID || "gabin1234"; // Identifiant unique pour le websocket (peut être n'importe quoi)

const CHANNELS = {
  seed: "1389273310935777330",
  gear: "1389273421954678805",
  pets: "1389273499746697216",
  cosmetics: "1389273644630282261",
  events: "1389273799073206363",
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

let lastMessages = {
  seed: null,
  gear: null,
  pets: null,
  cosmetics: null,
  events: null,
};

// Fonction pour formater un nom en item_id compatible URL image
function formatItemId(name) {
  return name.toLowerCase().replace(/ /g, "_");
}

function createEmbed(title, items) {
  const embed = new EmbedBuilder()
    .setTitle(`Shop Grow a Garden - ${title}`)
    .setColor(0x1abc9c)
    .setTimestamp();

  if (!items || items.length === 0) {
    embed.setDescription("Aucun item disponible actuellement.");
    return embed;
  }

  items.slice(0, 25).forEach((item) => {
    // Construction URL de l'image
    const imageUrl = `https://image.joshlei.com/${formatItemId(item.name)}.png`;

    embed.addFields({
      name: `${item.name} - ${item.price} ${item.currency}`,
      value: item.description || "Pas de description",
      inline: false,
    });

    // Pour Discord.js v14, tu ne peux pas mettre une miniature par champ.
    // Tu peux définir une miniature globale, ici on prend la première image du premier item
    // Donc on va l’ajouter en miniature globale plus bas
  });

  // Ajout de la miniature globale sur l’embed avec la première image d’un item si dispo
  if (items.length > 0) {
    const firstImageUrl = `https://image.joshlei.com/${formatItemId(items[0].name)}.png`;
    embed.setThumbnail(firstImageUrl);
  }

  return embed;
}

async function updateChannel(channelId, items, category) {
  const channel = await client.channels.fetch(channelId);
  if (!channel) {
    console.error(`Salon introuvable: ${channelId}`);
    return;
  }

  try {
    if (lastMessages[category]) {
      const oldMsg = await channel.messages.fetch(lastMessages[category]);
      if (oldMsg) await oldMsg.delete();
    }
  } catch (err) {
    // Ignore erreurs (message déjà supprimé par ex)
  }

  const embed = createEmbed(category.toUpperCase(), items);
  const message = await channel.send({ embeds: [embed] });
  lastMessages[category] = message.id;
}

function connectWebSocket() {
  const ws = new WebSocket(
    `wss://websocket.joshlei.com/growagarden?user_id=${encodeURIComponent(USER_ID)}`,
  );

  ws.on("open", () => {
    console.log("Connexion WebSocket établie.");
  });

  ws.on("message", async (data) => {
    try {
      const json = JSON.parse(data.toString());

      await updateChannel(CHANNELS.seed, json.seed, "seed");
      await updateChannel(CHANNELS.gear, json.gear, "gear");
      await updateChannel(CHANNELS.pets, json.pets, "pets");
      await updateChannel(CHANNELS.cosmetics, json.cosmetics, "cosmetics");
      await updateChannel(CHANNELS.events, json.events, "events");
    } catch (e) {
      console.error("Erreur lors du traitement du message WebSocket :", e);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket erreur:", err);
  });

  ws.on("close", () => {
    console.log("Connexion WebSocket fermée. Reconnexion dans 5 secondes...");
    setTimeout(connectWebSocket, 5000);
  });
}

client.once("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  connectWebSocket();
});

client.login(DISCORD_TOKEN);
