require('dotenv').config(); // Charge les variables .env
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const WebSocket = require('ws');

// On récupère les variables importantes
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_SEEDS = process.env.CHANNEL_SEEDS;
const CHANNEL_GEAR = process.env.CHANNEL_GEAR;
const CHANNEL_EGGS = process.env.CHANNEL_EGGS;
const CHANNEL_COSMETICS = process.env.CHANNEL_COSMETICS;
const CHANNEL_EVENTS = process.env.CHANNEL_EVENTS;
const USER_ID_WS = process.env.USER_ID_WS || 'growagarden_bot_01';

// Crée une instance du client Discord avec les intents nécessaires
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// On va stocker l'ID du dernier message posté dans chaque salon pour le supprimer avant de poster un nouveau message
const lastMessages = {
  seeds: null,
  gear: null,
  eggs: null,
  cosmetics: null,
  events: null
};

// Quand le bot est prêt
client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);

  // Récupère les salons par leurs IDs
  const channels = {
    seeds: client.channels.cache.get(CHANNEL_SEEDS),
    gear: client.channels.cache.get(CHANNEL_GEAR),
    eggs: client.channels.cache.get(CHANNEL_EGGS),
    cosmetics: client.channels.cache.get(CHANNEL_COSMETICS),
    events: client.channels.cache.get(CHANNEL_EVENTS)
  };

  // Vérifie que tous les salons sont bien trouvés
  for (const [key, ch] of Object.entries(channels)) {
    if (!ch) {
      console.error(`Salon pour ${key} non trouvé. Vérifie les IDs !`);
      process.exit(1);
    }
  }

  // Connexion WebSocket au serveur Grow A Garden
  const ws = new WebSocket(`wss://websocket.joshlei.com/growagarden?user_id=${encodeURIComponent(USER_ID_WS)}`);

  ws.on('open', () => {
    console.log('WebSocket Grow A Garden connectée');
  });

  // Quand un message est reçu via WebSocket
  ws.on('message', async (data) => {
    try {
      // Parse les données JSON
      const json = JSON.parse(data);

      // Fonction pour poster un embed dans un salon, en supprimant le message précédent
      async function postUpdate(type, embed) {
        const channel = channels[type];
        if (!channel) return;

        // Supprime l'ancien message si existant
        if (lastMessages[type]) {
          try {
            const oldMsg = await channel.messages.fetch(lastMessages[type]);
            if (oldMsg) await oldMsg.delete();
          } catch (e) {
            // Pas grave si message introuvable ou erreur
          }
        }

        // Envoie le nouveau message embed
        const sentMsg = await channel.send({ embeds: [embed] });
        // Mémorise l'ID du message envoyé
        lastMessages[type] = sentMsg.id;
      }

      // Pour chaque catégorie, si le stock est présent, on crée un embed et on poste
      if (json.stocks && json.stocks.Seeds) {
        const embedSeeds = new EmbedBuilder()
          .setTitle('Shop Seeds')
          .setColor('#00FF00')
          .setTimestamp();

        let desc = '';
        json.stocks.Seeds.forEach(item => {
          desc += `- **${item.display_name}** : ${item.price} ${item.currency}\n`;
        });
        embedSeeds.setDescription(desc || 'Aucun seed actuellement.');

        await postUpdate('seeds', embedSeeds);
      }

      if (json.stocks && json.stocks.Gear) {
        const embedGear = new EmbedBuilder()
          .setTitle('Shop Gear')
          .setColor('#0099FF')
          .setTimestamp();

        let desc = '';
        json.stocks.Gear.forEach(item => {
          desc += `- **${item.display_name}** : ${item.price} ${item.currency}\n`;
        });
        embedGear.setDescription(desc || 'Aucun gear actuellement.');

        await postUpdate('gear', embedGear);
      }

      if (json.stocks && json.stocks.Eggs) {
        const embedEggs = new EmbedBuilder()
          .setTitle('Shop Eggs')
          .setColor('#FF9900')
          .setTimestamp();

        let desc = '';
        json.stocks.Eggs.forEach(item => {
          desc += `- **${item.display_name}** : ${item.price} ${item.currency}\n`;
        });
        embedEggs.setDescription(desc || 'Aucun egg actuellement.');

        await postUpdate('eggs', embedEggs);
      }

      if (json.stocks && json.stocks.Cosmetics) {
        const embedCosmetics = new EmbedBuilder()
          .setTitle('Shop Cosmetics')
          .setColor('#FF00FF')
          .setTimestamp();

        let desc = '';
        json.stocks.Cosmetics.forEach(item => {
          desc += `- **${item.display_name}** : ${item.price} ${item.currency}\n`;
        });
        embedCosmetics.setDescription(desc || 'Aucun cosmetic actuellement.');

        await postUpdate('cosmetics', embedCosmetics);
      }

      if (json.events) {
        const embedEvents = new EmbedBuilder()
          .setTitle('Événements Grow A Garden')
          .setColor('#FFFF00')
          .setTimestamp();

        let desc = '';
        json.events.forEach(event => {
          desc += `- **${event.name}**\n  > ${event.description || 'Pas de description'}\n`;
        });
        embedEvents.setDescription(desc || 'Aucun événement actuellement.');

        await postUpdate('events', embedEvents);
      }

    } catch (err) {
      console.error('Erreur traitement message websocket:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket fermée, tentative de reconnexion dans 10s...');
    setTimeout(() => reconnectWebSocket(), 10000);
  });

  ws.on('error', error => {
    console.error('Erreur WebSocket:', error);
  });

  function reconnectWebSocket() {
    const wsNew = new WebSocket(`wss://websocket.joshlei.com/growagarden?user_id=${encodeURIComponent(USER_ID_WS)}`);
    wsNew.on('open', () => console.log('WebSocket reconnectée'));
    wsNew.on('message', ws.listeners('message')[0]);
    wsNew.on('close', ws.listeners('close')[0]);
    wsNew.on('error', ws.listeners('error')[0]);
  }
});

// Connexion du bot à Discord avec le token
client.login(DISCORD_TOKEN);
