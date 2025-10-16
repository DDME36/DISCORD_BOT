import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  StreamType,
  demuxProbe
} from '@discordjs/voice';
import youtubedl from 'youtube-dl-exec';
import yts from 'yt-search';
import { config } from 'dotenv';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// เก็บ queue เพลงแต่ละ server
const queues = new Map();

// Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 เล่นเพลงจาก YouTube')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('ชื่อเพลงหรือ URL')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('⏭️ ข้ามเพลงปัจจุบัน'),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('⏹️ หยุดเพลงและออกจาก voice channel'),
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('📋 ดูรายการเพลงใน queue'),
  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('🎵 ดูเพลงที่กำลังเล่นอยู่'),
  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('⏸️ หยุดเพลงชั่วคราว'),
  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('▶️ เล่นเพลงต่อ'),
].map(command => command.toJSON());

// ลงทะเบียน Slash Commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('clientReady', async () => {
  console.log(`✅ Bot พร้อมใช้งานแล้ว! ล็อกอินเป็น ${client.user.tag}`);
  
  try {
    console.log('🔄 กำลังลงทะเบียน Slash Commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ ลงทะเบียน Slash Commands สำเร็จ!');
  } catch (error) {
    console.error('❌ ลงทะเบียน Slash Commands ไม่สำเร็จ:', error);
  }
});

// Error handler
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Slash Command Handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  
  // ตรวจสอบว่า interaction ยังใช้งานได้
  if (interaction.replied || interaction.deferred) {
    console.log('⚠️ Interaction already replied or deferred');
    return;
  }

  // Button Handler
  if (interaction.isButton()) {
    const serverQueue = queues.get(interaction.guild.id);
    
    if (interaction.customId === 'pause') {
      if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
      serverQueue.player.pause();
      return interaction.reply({ content: '⏸️ หยุดเพลงชั่วคราวแล้ว!', ephemeral: true });
    }
    
    if (interaction.customId === 'resume') {
      if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
      serverQueue.player.unpause();
      return interaction.reply({ content: '▶️ เล่นเพลงต่อแล้ว!', ephemeral: true });
    }
    
    if (interaction.customId === 'skip') {
      if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
      serverQueue.player.stop();
      return interaction.reply({ content: '⏭️ ข้ามเพลงแล้ว!', ephemeral: true });
    }
    
    if (interaction.customId === 'stop') {
      if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
      serverQueue.songs = [];
      serverQueue.player.stop();
      serverQueue.connection.destroy();
      queues.delete(interaction.guild.id);
      return interaction.reply({ content: '⏹️ หยุดเพลงและออกจาก voice channel แล้ว!', ephemeral: true });
    }
  }

  // Slash Command Handler
  const { commandName } = interaction;

  if (commandName === 'play') {
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: '❌ คุณต้องอยู่ใน voice channel ก่อนนะ!', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    
    // Defer ทันทีภายใน 3 วินาที
    await interaction.deferReply();

    try {
      console.log(`🔍 กำลังค้นหา: ${query}`);
      
      let videoUrl = query;
      let videoInfo;
      
      // ตรวจสอบว่าเป็น URL หรือไม่
      if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
        // ค้นหาจากชื่อเพลง
        try {
          const searchResults = await yts(query);
          if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return interaction.editReply({ content: '❌ หาเพลงไม่เจอเลย ลองใหม่สิ!', embeds: [], components: [] });
          }
          
          videoUrl = searchResults.videos[0].url;
          console.log(`✅ เจอเพลง: ${searchResults.videos[0].title}`);
        } catch (searchError) {
          console.error('Search error:', searchError);
          return interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการค้นหา ลองใช้ YouTube URL โดยตรงแทน!', embeds: [], components: [] });
        }
      }
      
      // ดึงข้อมูลวิดีโอ
      let videoInfo;
      try {
        videoInfo = await youtubedl(videoUrl, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true
        });
      } catch (ytdlError) {
        console.error('Youtube-dl error:', ytdlError);
        return interaction.editReply({ content: '❌ ไม่สามารถดึงข้อมูลวิดีโอได้ ตรวจสอบ URL หรือลองใหม่อีกครั้ง!', embeds: [], components: [] });
      }
      
      const song = {
        title: videoInfo.title,
        url: videoInfo.webpage_url,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        requester: interaction.user.tag
      };
      
      console.log(`✅ เพลง: ${song.title}`);

      const serverQueue = queues.get(interaction.guild.id);

      if (!serverQueue) {
        const queueConstruct = {
          voiceChannel: interaction.member.voice.channel,
          connection: null,
          player: createAudioPlayer(),
          songs: [song],
          playing: true,
          textChannel: interaction.channel,
        };

        queues.set(interaction.guild.id, queueConstruct);

        try {
          const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });

          queueConstruct.connection = connection;
          connection.subscribe(queueConstruct.player);

          await playSong(interaction.guild, queueConstruct.songs[0]);
          
          const buttons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('pause')
                .setLabel('⏸️ Pause')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('resume')
                .setLabel('▶️ Resume')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger)
            );

          const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setAuthor({ 
              name: '🎵 WAVE Music Player', 
              iconURL: client.user.displayAvatarURL() 
            })
            .setTitle('▶️ Now Playing')
            .setDescription(`### ${song.title}\n\`\`\`fix\n🎧 กำลังเล่นเพลงนี้อยู่...\`\`\``)
            .setURL(song.url)
            .setImage(song.thumbnail)
            .addFields(
              { name: '⏱️ Duration', value: `\`${formatDuration(song.duration)}\``, inline: true },
              { name: '👤 Requested by', value: `\`${song.requester}\``, inline: true },
              { name: '🔊 Voice Channel', value: `\`${interaction.member.voice.channel.name}\``, inline: true }
            )
            .setFooter({ 
              text: `🎵 Powered by WAVE Bot • Queue: ${queueConstruct.songs.length} songs`, 
              iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
          
          interaction.editReply({ content: null, embeds: [embed], components: [buttons] });
        } catch (err) {
          console.error(err);
          queues.delete(interaction.guild.id);
          return interaction.editReply({ content: '❌ เข้า voice channel ไม่ได้! ลองใหม่สิ', embeds: [], components: [] });
        }
      } else {
        serverQueue.songs.push(song);
        
        const embed = new EmbedBuilder()
          .setColor('#00D9FF')
          .setAuthor({ 
            name: '✅ Added to Queue', 
            iconURL: client.user.displayAvatarURL() 
          })
          .setDescription(`### ${song.title}\n\`\`\`yaml\n📝 เพิ่มเข้า Queue แล้ว!\`\`\``)
          .setURL(song.url)
          .setThumbnail(song.thumbnail)
          .addFields(
            { name: '📍 Position', value: `\`#${serverQueue.songs.length}\``, inline: true },
            { name: '⏱️ Duration', value: `\`${formatDuration(song.duration)}\``, inline: true },
            { name: '👤 Requested by', value: `\`${song.requester}\``, inline: true }
          )
          .setFooter({ 
            text: `🎵 Total in Queue: ${serverQueue.songs.length} songs`, 
            iconURL: interaction.user.displayAvatarURL() 
          })
          .setTimestamp();
        
        return interaction.editReply({ content: null, embeds: [embed], components: [] });
      }
    } catch (error) {
      console.error('Error:', error);
      try {
        await interaction.editReply({ content: '❌ เกิดข้อผิดพลาด! ลองใหม่อีกทีสิ\n```' + error.message + '```', embeds: [], components: [] });
      } catch (e) {
        console.error('Cannot edit reply:', e);
      }
    }
  }

  if (commandName === 'skip') {
    const serverQueue = queues.get(interaction.guild.id);
    if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่นะ!', ephemeral: true });
    if (!interaction.member.voice.channel) return interaction.reply({ content: '❌ เข้า voice channel ก่อนสิ!', ephemeral: true });
    
    serverQueue.player.stop();
    interaction.reply('⏭️ ข้ามเพลงแล้ว!');
  }

  if (commandName === 'stop') {
    const serverQueue = queues.get(interaction.guild.id);
    if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่นะ!', ephemeral: true });
    if (!interaction.member.voice.channel) return interaction.reply({ content: '❌ เข้า voice channel ก่อนสิ!', ephemeral: true });
    
    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queues.delete(interaction.guild.id);
    interaction.reply('⏹️ หยุดเพลงและออกจาก voice channel แล้ว!');
  }

  if (commandName === 'queue') {
    const serverQueue = queues.get(interaction.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return interaction.reply({ content: '❌ ไม่มีเพลงใน queue เลย!', ephemeral: true });
    }

    const queueList = serverQueue.songs
      .slice(0, 10)
      .map((song, index) => {
        const emoji = index === 0 ? '▶️' : `\`${index}\``;
        const status = index === 0 ? '**[NOW PLAYING]**' : '';
        return `${emoji} [${song.title}](${song.url}) ${status}`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setAuthor({ 
        name: '📋 Music Queue', 
        iconURL: client.user.displayAvatarURL() 
      })
      .setDescription(`\`\`\`fix\n🎵 รายการเพลงทั้งหมด\`\`\`\n${queueList}`)
      .addFields(
        { name: '📊 Total Songs', value: `\`${serverQueue.songs.length}\` songs`, inline: true },
        { name: '⏱️ Total Duration', value: `\`${formatDuration(serverQueue.songs.reduce((acc, song) => acc + song.duration, 0))}\``, inline: true },
        { name: '🔊 Voice Channel', value: `\`${serverQueue.voiceChannel.name}\``, inline: true }
      )
      .setFooter({ 
        text: '🎵 WAVE Music Player', 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'nowplaying') {
    const serverQueue = queues.get(interaction.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
    }

    const song = serverQueue.songs[0];
    const nextSong = serverQueue.songs.length > 1 ? serverQueue.songs[1].title : 'ไม่มีเพลงถัดไป';
    
    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setAuthor({ 
        name: '🎵 Now Playing', 
        iconURL: client.user.displayAvatarURL() 
      })
      .setTitle(song.title)
      .setURL(song.url)
      .setImage(song.thumbnail)
      .setDescription(`\`\`\`fix\n▶️ กำลังเล่นเพลงนี้อยู่...\`\`\``)
      .addFields(
        { name: '⏱️ Duration', value: `\`${formatDuration(song.duration)}\``, inline: true },
        { name: '👤 Requested by', value: `\`${song.requester}\``, inline: true },
        { name: '🔊 Voice Channel', value: `\`${serverQueue.voiceChannel.name}\``, inline: true },
        { name: '⏭️ Up Next', value: `${nextSong}`, inline: false }
      )
      .setFooter({ 
        text: `🎵 Queue: ${serverQueue.songs.length} songs remaining`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'pause') {
    const serverQueue = queues.get(interaction.guild.id);
    if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
    
    serverQueue.player.pause();
    interaction.reply('⏸️ หยุดเพลงชั่วคราวแล้ว!');
  }

  if (commandName === 'resume') {
    const serverQueue = queues.get(interaction.guild.id);
    if (!serverQueue) return interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่!', ephemeral: true });
    
    serverQueue.player.unpause();
    interaction.reply('▶️ เล่นเพลงต่อแล้ว!');
  }
});

async function playSong(guild, song) {
  const serverQueue = queues.get(guild.id);
  
  if (!serverQueue) {
    console.log('❌ ไม่พบ serverQueue');
    return;
  }
  
  if (!song) {
    if (serverQueue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setAuthor({ 
          name: '✅ Queue Finished', 
          iconURL: client.user.displayAvatarURL() 
        })
        .setDescription(`\`\`\`fix\n🎵 เล่นเพลงครบทุกเพลงแล้ว!\`\`\`\n**ออกจาก voice channel แล้ว** 👋`)
        .setFooter({ text: '🎵 WAVE Music Player' })
        .setTimestamp();
      serverQueue.textChannel.send({ embeds: [embed] });
    }
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    queues.delete(guild.id);
    return;
  }

  try {
    console.log(`🎵 กำลังเล่น: ${song.title}`);
    
    // ใช้ yt-dlp stream
    const process = youtubedl.exec(song.url, {
      output: '-',
      format: 'bestaudio',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true
    });
    
    const stream = process.stdout;
    const { stream: audioStream, type } = await demuxProbe(stream);
    
    const resource = createAudioResource(audioStream, {
      inputType: type
    });

    serverQueue.player.play(resource);

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
      const queue = queues.get(guild.id);
      if (queue && queue.songs.length > 0) {
        queue.songs.shift();
        playSong(guild, queue.songs[0]);
      }
    });

    serverQueue.player.on('error', error => {
      console.error('Player Error:', error);
      const queue = queues.get(guild.id);
      if (queue && queue.songs.length > 0) {
        queue.songs.shift();
        playSong(guild, queue.songs[0]);
      }
    });
  } catch (error) {
    console.error('Play Error:', error);
    if (serverQueue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setDescription('❌ เกิดข้อผิดพลาดในการเล่นเพลง ข้ามไปเพลงถัดไป...')
        .setFooter({ text: 'Error: ' + error.message });
      serverQueue.textChannel.send({ embeds: [embed] });
    }
    const queue = queues.get(guild.id);
    if (queue && queue.songs.length > 0) {
      queue.songs.shift();
      playSong(guild, queue.songs[0]);
    }
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

client.login(process.env.DISCORD_TOKEN);
