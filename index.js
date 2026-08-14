const { Client, GatewayIntentBits } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');

// Inicialización del cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Nodo Lavalink Público
const Nodes = [{
    name: 'Public-Node-Free',
    url: 'lavalink.jirayu.net:13592',
    auth: 'youshallnotpass',
    secure: false
}];

// Instancia de Kazagumo para gestionar la música
const kazagumo = new Kazagumo({
    defaultSearchEngine: 'youtube',
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Connectors.DiscordJS(client), Nodes);

// Eventos de conexión
kazagumo.shoukaku.on('ready', (name) => console.log(`✅ Lavalink listo: ${name}`));
kazagumo.shoukaku.on('error', (name, error) => console.error(`❌ Error en Lavalink (${name}):`, error));

client.once('ready', () => {
    console.log(`🤖 Bot encendido correctamente como: ${client.user.tag}`);
});

// Manejo de comandos
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Comando !play
    if (command === 'play') {
        const query = args.join(' ');
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) return message.reply('¡Debes unirte a un canal de voz primero!');
        if (!query) return message.reply('Escribe el nombre o enlace de la canción. Ejemplo: `!play cancion`');

        let player = await kazagumo.createPlayer({
            guildId: message.guild.id,
            textId: message.channel.id,
            voiceId: voiceChannel.id,
            deaf: true
        });

        const result = await kazagumo.search(query, { requester: message.author });
        if (!result.tracks.length) return message.reply('No se encontraron canciones.');

        if (result.type === 'PLAYLIST') {
            for (const track of result.tracks) player.queue.add(track);
            message.reply(`Playlist añadida: **${result.playlistName}** (${result.tracks.length} canciones).`);
        } else {
            player.queue.add(result.tracks[0]);
            message.reply(`Añadido a la lista: **${result.tracks[0].title}**`);
        }

        if (!player.playing && !player.paused) player.play();
    }

    // Comando !stop
    if (command === 'stop') {
        const player = kazagumo.getPlayer(message.guild.id);
        if (player) {
            player.destroy();
            message.reply('⏹️ Música detenida y desconectado del canal.');
        } else {
            message.reply('El bot no está reproduciendo nada en este servidor.');
        }
    }
});

// Lee el token desde las variables de entorno de la plataforma donde lo alojes
client.login(process.env.DISCORD_TOKEN);
