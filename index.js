
const {
    Client,
    GatewayIntentBits,
    Events
} = require("discord.js");

const {
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

let connection = null;
let reconnectTimer = null;

async function connectToVoice() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

        if (!channel || !channel.isVoiceBased()) {
            throw new Error("Ses kanalı bulunamadı veya geçersiz.");
        }

        const permissions = channel.permissionsFor(client.user);

        if (!permissions?.has("Connect")) {
            throw new Error("Botun ses kanalına bağlanma izni yok.");
        }

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: true
        });

        console.log("Ses kanalına bağlanılıyor...");

        connection.on("stateChange", (oldState, newState) => {
            console.log(
                `Ses bağlantısı: ${oldState.status} -> ${newState.status}`
            );

            if (newState.status === VoiceConnectionStatus.Ready) {
                console.log("1709 Voice başarıyla ses kanalına bağlandı!");

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
            }

            if (
                newState.status === VoiceConnectionStatus.Disconnected ||
                newState.status === VoiceConnectionStatus.Destroyed
            ) {
                scheduleReconnect(connection);
            }
        });

        connection.on("error", error => {
            console.error("Ses bağlantısı hatası:", error);
        });

    } catch (error) {
        console.error("Bağlantı kurulamadı:", error);
        scheduleReconnect(connection);
    }
}

function scheduleReconnect(oldConnection) {
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;

        if (oldConnection && connection === oldConnection) {
            connection = null;

            try {
                oldConnection.destroy();
            } catch (error) {
                console.error(error);
            }
        }

        await connectToVoice();
    }, 15000);
}

client.once(Events.ClientReady, async () => {
    console.log(`${client.user.tag} aktif!`);
    await connectToVoice();
});

client.on(Events.Error, error => {
    console.error("Discord bağlantı hatası:", error);
});

if (!TOKEN || !GUILD_ID || !VOICE_CHANNEL_ID) {
    throw new Error("Render Environment değişkenleri eksik!");
}

client.login(TOKEN);
