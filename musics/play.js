const Discord = require("discord.js");
const {
  validURL,
  validYTURL,
  validSPURL,
  isGoodMusicVideoContent,
  decodeHtmlEntity,
  encodeHtmlEntity
} = require("../function.js");
const ytdl = require("ytdl-core-discord");
const YouTube = require("simple-youtube-api");
var youtube = new YouTube(process.env.YT);
var color = Math.floor(Math.random() * 16777214) + 1;
var SpotifyWebApi = require("spotify-web-api-node");
// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTID,
  clientSecret: process.env.SPOTSECRET,
  redirectUri: "https://nwws.ml"
});
const fs = require("fs");
const request = require("request-stream");
const mm = require("music-metadata");
const ytsr = require("ytsr");
const moment = require("moment");
const formatSetup = require("moment-duration-format");
formatSetup(moment);

async function play(guild, song, looping, queue, pool, repeat) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    guild.me.voice.channel.leave();
    queue.delete(guild.id);
    pool.getConnection(function(err, con) {
      con.query(
        "UPDATE servers SET queue = NULL WHERE id = " + guild.id,
        function(err, result) {
          if (err) throw err;
          console.log("Updated song queue of " + guild.name);
        }
      );
      con.release();
    });
    return;
  }

  if (serverQueue.connection === null) return;

  var dispatcher;
  if (song.type === 2) {
    await request(song.url, (err, res) => {
      dispatcher = serverQueue.connection.play(res, { highWaterMark: 1 << 28 });
      dispatcher
        .on("finish", async () => {
          dispatcher = null;
          const guildLoopStatus = looping.get(guild.id);
          const guildRepeatStatus = repeat.get(guild.id);
          console.log("Music ended! In " + guild.name);
          
          if (guildLoopStatus === true) {
            await serverQueue.songs.push(song);
          }
          if (guildRepeatStatus !== true) {
            await serverQueue.songs.shift();
          }

          pool.getConnection(function(err, con) {
            con.query(
              "UPDATE servers SET queue = '" +
                escape(JSON.stringify(serverQueue.songs)) +
                "' WHERE id = " +
                guild.id,
              function(err, result) {
                if (err) throw err;
                console.log("Updated song queue of " + guild.name);
              }
            );
            con.release();
          });
          play(guild, serverQueue.songs[0], looping, queue, pool, repeat);
        })
        .on("error", error => {
          console.error(error);
        });
      dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    });
  } else {
    dispatcher = serverQueue.connection.play(
      await ytdl(song.url, { highWaterMark: 1 << 28 }),
      { type: "opus" }
    );
    dispatcher
      .on("finish", async () => {
        dispatcher = null;
        const guildLoopStatus = looping.get(guild.id);
        const guildRepeatStatus = repeat.get(guild.id);
        console.log("Music ended! In " + guild.name);

        if (guildLoopStatus === true) {
          await serverQueue.songs.push(song);
        }
        if (guildRepeatStatus !== true) {
          await serverQueue.songs.shift();
        }

        pool.getConnection(function(err, con) {
          con.query(
            "UPDATE servers SET queue = '" +
              escape(JSON.stringify(serverQueue.songs)) +
              "' WHERE id = " +
              guild.id,
            function(err, result) {
              if (err) throw err;
              console.log("Updated song queue of " + guild.name);
            }
          );
          con.release();
        });
        play(guild, serverQueue.songs[0], looping, queue, pool, repeat);
      })
      .on("error", error => {
        console.error(error);
      });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  }
}

module.exports = {
  name: "play",
  description:
    "Play music with the link or keywords provided. Only support YouTube videos currently.",
  aliases: ["add"],
  usage: "<link | keywords>",
  async music(message, serverQueue, looping, queue, pool, repeat) {
    const args = message.content.split(/ +/);

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send("I can't play in your voice channel!");
    }

    if (!args[1]) {
      if (message.attachments.size < 1) {
        if (!serverQueue)
          return message.channel.send(
            "No song queue found for this server! Please provide a link or keywords to get a music played!"
          );
        if (serverQueue.playing === true)
          return message.channel.send("Music is already playing!");

        if (
          !message.guild.me.voice.channel ||
          message.guild.me.voice.channelID !== voiceChannel.id
        ) {
          var connection = await voiceChannel.join();
        } else {
          await message.guild.me.voice.channel.leave();
          var connection = await voiceChannel.join();
        }
        serverQueue.voiceChannel = voiceChannel;
        serverQueue.connection = connection;
        serverQueue.playing = true;
        serverQueue.textChannel = message.channel;
        await queue.set(message.guild.id, serverQueue);
        play(message.guild, serverQueue.songs[0], looping, queue, pool, repeat);
        var song = serverQueue.songs[0];
        const Embed = new Discord.MessageEmbed()
          .setColor(color)
          .setTitle("Now playing:")
          .setThumbnail(song.type === 2 ? song.thumbnail : undefined)
          .setDescription(
            `**[${song.title}](${
              song.type === 1 ? song.spot : song.url
            })**\nLength: **${song.time}**`
          )
          .setTimestamp()
          .setFooter(
            "Have a nice day! :)",
            message.client.user.displayAvatarURL()
          );
        message.channel.send(Embed);
      } else {
        var file = message.attachments.first();
        if (!file.url.endsWith(".mp3"))
          return message.channel.send(
            "The attachment you sent is not an audio file!"
          );
        request(file.url, async (err, res) => {
          if (err)
            return message.reply(
              "there was an error trying to execute that command!"
            );
          var metadata = await mm.parseStream(res).catch(console.error);
          if (metadata === undefined)
            return message.channel.send(
              "An error occured while parsing the mp3 file into stream! Maybe it is not link to the file?"
            );
          var length = Math.round(metadata.format.duration);
          var songLength = moment.duration(length, "seconds").format();
          var song = {
            title: file.name.slice(0, -4).replace(/_/g, " "),
            url: file.url,
            type: 2,
            time: songLength
          };
          if (!serverQueue) {
            const queueContruct = {
              textChannel: message.channel,
              voiceChannel: voiceChannel,
              connection: null,
              songs: [song],
              volume: 5,
              playing: true,
              paused: false
            };

            queue.set(message.guild.id, queueContruct);
            try {
              pool.getConnection(function(err, con) {
                con.query(
                  "UPDATE servers SET queue = '" +
                    escape(JSON.stringify(queueContruct.songs)) +
                    "' WHERE id = " +
                    message.guild.id,
                  function(err, result) {
                    if (err)
                      return message.reply(
                        "there was an error trying to execute that command!"
                      );
                    console.log("Updated song queue of " + message.guild.name);
                  }
                );
                con.release();
              });
              var connection = await voiceChannel.join();
              queueContruct.connection = connection;

              play(
                message.guild,
                queueContruct.songs[0],
                looping,
                queue,
                pool,
                repeat
              );

              const Embed = new Discord.MessageEmbed()
                .setColor(color)
                .setTitle("Now playing:")
                .setDescription(
                  `**[${song.title}](${song.url})**\nLength: **${song.time}**`
                )
                .setTimestamp()
                .setFooter(
                  "Have a nice day! :)",
                  message.client.user.displayAvatarURL()
                );
              return message.channel.send(Embed);
            } catch (err) {
              queue.delete(message.guild.id);
              return console.error(err);
            }
          } else {
            serverQueue.songs.push(song);

            pool.getConnection(function(err, con) {
              con.query(
                "UPDATE servers SET queue = '" +
                  escape(JSON.stringify(serverQueue.songs)) +
                  "' WHERE id = " +
                  message.guild.id,
                function(err, result) {
                  if (err)
                    return message.reply(
                      "there was an error trying to execute that command!"
                    );
                  console.log("Updated song queue of " + message.guild.name);
                }
              );
              con.release();
            });
            if (!message.guild.me.voice.channel) {
              var connection = await voiceChannel.join();
              serverQueue.voiceChannel = voiceChannel;
              serverQueue.connection = connection;
              serverQueue.playing = true;
              serverQueue.textChannel = message.channel;
              play(
                message.guild,
                serverQueue.songs[0],
                looping,
                queue,
                pool,
                repeat
              );
            } else if (serverQueue.playing === false) {
              play(
                message.guild,
                serverQueue.songs[0],
                looping,
                queue,
                pool,
                repeat
              );
            }
            var Embed = new Discord.MessageEmbed()
              .setColor(color)
              .setTitle("New track added:")
              .setDescription(
                `**[${song.title}](${song.url})**\nLength: **${song.time}**`
              )
              .setTimestamp()
              .setFooter(
                "Have a nice day! :)",
                message.client.user.displayAvatarURL()
              );
            return message.channel.send(Embed);
          }
        });
      }

      return;
    }

    const checkURL = validURL(args[1]);

    if (checkURL === true) {
      if (validYTURL(args[1]) === false) {
        if (validSPURL(args[1]) === false) {
          if (!args[1].endsWith(".mp3"))
            return message.channel.send(
              "We only support YouTube/Spotify video/track/direct links (.mp3)/attached files (.mp3), sorry!"
            );
          var linkArr = args[1].split("/");
          if (
            linkArr[linkArr.length - 1].endsWith(".mp3") &&
            linkArr[linkArr.length - 1].split("?").length == 1
          ) {
            var title = linkArr[linkArr.length - 1]
              .slice(0, -4)
              .replace(/_/g, " ");
          } else {
            linkArr = args[1].split("?");
            var title = linkArr[linkArr.length - 1]
              .slice(0, -4)
              .replace(/_/g, " ");
          }
          request(args[1], async (err, res) => {
            if (err)
              return message.reply(
                "there was an error trying to execute that command!"
              );
            var metadata = await mm.parseStream(res).catch(console.error);
            if (metadata === undefined)
              return message.channel.send(
                "An error occured while parsing the mp3 file into stream! Maybe it is not link to the file?"
              );
            var length = Math.round(metadata.format.duration);
            var songLength = moment.duration(length, "seconds").format();
            var song = {
              title: title,
              url: args[1],
              type: 2,
              time: songLength
            };
            if (!serverQueue) {
              const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [song],
                volume: 5,
                playing: true,
                paused: false
              };

              queue.set(message.guild.id, queueContruct);
              try {
                pool.getConnection(function(err, con) {
                  con.query(
                    "UPDATE servers SET queue = '" +
                      escape(JSON.stringify(queueContruct.songs)) +
                      "' WHERE id = " +
                      message.guild.id,
                    function(err, result) {
                      if (err)
                        return message.reply(
                          "there was an error trying to execute that command!"
                        );
                      console.log(
                        "Updated song queue of " + message.guild.name
                      );
                    }
                  );
                  con.release();
                });
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;

                play(
                  message.guild,
                  queueContruct.songs[0],
                  looping,
                  queue,
                  pool,
                  repeat
                );

                const Embed = new Discord.MessageEmbed()
                  .setColor(color)
                  .setTitle("Now playing:")
                  .setDescription(
                    `**[${song.title}](${song.url})**\nLength: **${song.time}**`
                  )
                  .setTimestamp()
                  .setFooter(
                    "Have a nice day! :)",
                    message.client.user.displayAvatarURL()
                  );
                return message.channel.send(Embed);
              } catch (err) {
                queue.delete(message.guild.id);
                return console.error(err);
              }
            } else {
              serverQueue.songs.push(song);

              pool.getConnection(function(err, con) {
                con.query(
                  "UPDATE servers SET queue = '" +
                    escape(JSON.stringify(serverQueue.songs)) +
                    "' WHERE id = " +
                    message.guild.id,
                  function(err, result) {
                    if (err)
                      return message.reply(
                        "there was an error trying to execute that command!"
                      );
                    console.log("Updated song queue of " + message.guild.name);
                  }
                );
                con.release();
              });
              if (!message.guild.me.voice.channel) {
                var connection = await voiceChannel.join();
                serverQueue.voiceChannel = voiceChannel;
                serverQueue.connection = connection;
                serverQueue.playing = true;
                serverQueue.textChannel = message.channel;
                play(
                  message.guild,
                  serverQueue.songs[0],
                  looping,
                  queue,
                  pool,
                  repeat
                );
              } else if (serverQueue.playing === false) {
                play(
                  message.guild,
                  serverQueue.songs[0],
                  looping,
                  queue,
                  pool,
                  repeat
                );
              }
              var Embed = new Discord.MessageEmbed()
                .setColor(color)
                .setTitle("New track added:")
                .setDescription(
                  `**[${song.title}](${song.url})**\nLength: **${song.time}**`
                )
                .setTimestamp()
                .setFooter(
                  "Have a nice day! :)",
                  message.client.user.displayAvatarURL()
                );
              return message.channel.send(Embed);
            }
          });
          return;
        }

        var d = await spotifyApi.clientCredentialsGrant();

        await spotifyApi.setAccessToken(d.body.access_token);
        await spotifyApi.setRefreshToken(process.env.SPOTREFRESH);

        var refreshed = await spotifyApi
          .refreshAccessToken()
          .catch(console.error);

        console.log("The access token has been refreshed!");

        // Save the access token so that it's used in future calls
        await spotifyApi.setAccessToken(refreshed.body.access_token);

        var url_array = args[1].replace("https://", "").split("/");
        var musicID = url_array[2].split("?")[0];

        if (url_array[2].split("?")[1] !== undefined)
          var highlight =
            url_array[2].split("?")[1].split("=")[0] === "highlight";
        else var highlight = false;

        if (highlight)
          musicID = url_array[2]
            .split("?")[1]
            .split("=")[1]
            .split(":")[2];
        var type = url_array[1];
        var songs = [];
        switch (type) {
          case "playlist":
            var musics = await spotifyApi.getPlaylist(musicID, { limit: 30 });
            for (var i = 0; i < musics.body.tracks.items.length; i++) {
              var matched;
              try {
                var searched = await ytsr(
                  musics.body.tracks.items[i].track.artists[0].name +
                    " - " +
                    musics.body.tracks.items[i].track.name,
                  { limit: 100 }
                );
                var results = searched.items.filter(
                  x => x.type === "video" && x.duration.split(":").length < 3
                );
              } catch (err) {
                return console.error(err);
              }

              for (var s = 0; s < results.length; s++) {
                if (results.length == 0) break;
                if (isGoodMusicVideoContent(results[s])) {
                  var songLength = results[s].duration;
                  matched = {
                    title: musics.body.tracks.items[i].track.name,
                    url: results[s].link,
                    type: 1,
                    spot:
                      musics.body.tracks.items[i].track.external_urls.spotify,
                    thumbnail:
                      musics.body.tracks.items[i].track.album.images[0].url,
                    time: songLength
                  };
                  songs.push(matched);
                  break;
                }
                if (s + 1 == results.length) {
                  var songLength = results[0].duration;
                  matched = {
                    title: musics.body.tracks.items[i].track.name,
                    url: results[0].link,
                    type: 1,
                    spot:
                      musics.body.tracks.items[i].track.external_urls.spotify,
                    thumbnail:
                      musics.body.tracks.items[i].track.album.images[0].url,
                    time: songLength
                  };
                  songs.push(matched);
                }
              }
            }
            break;
          case "album":
            if (highlight === false) {
              var album = await spotifyApi
                .getAlbums([musicID])
                .catch(err => console.log("Something went wrong!", err));
              var image = album.albums[0].images[0].url;
              var data = await spotifyApi
                .getAlbumTracks(musicID, {
                  limit: 30
                })
                .catch(err => console.log("Something went wrong!", err));

              var tracks = data.body.items;
            } else {
              var data = await spotifyApi
                .getTracks([musicID])
                .catch(err => console.log("Something went wrong!", err));

              var tracks = data.body.tracks;
            }

            for (var i = 0; i < tracks.length; i++) {
              var matched;
              try {
                var searched = await ytsr(
                  tracks[i].artists[0].name + " - " + tracks[i].name,
                  { limit: 100 }
                );
                var results = searched.items.filter(
                  x => x.type === "video" && x.duration.split(":").length < 3
                );
              } catch (err) {
                return console.error(err);
              }
              for (var s = 0; s < results.length; s++) {
                if (results.length == 0) break;
                if (isGoodMusicVideoContent(results[s])) {
                  var songLength = results[s].duration;
                  matched = {
                    title: tracks[i].name,
                    url: results[s].link,
                    type: 1,
                    spot: tracks[i].external_urls.spotify,
                    thumbnail: highlight
                      ? tracks[i].album.images[0].url
                      : image,
                    time: songLength
                  };
                  songs.push(matched);
                  break;
                }
                if (s + 1 == results.length) {
                  var songLength = results[0].duration;
                  matched = {
                    title: tracks[i].name,
                    url: results[0].link,
                    type: 1,
                    spot: tracks[i].external_urls.spotify,
                    thumbnail: highlight
                      ? tracks[i].album.images[0].url
                      : image,
                    time: songLength
                  };
                  songs.push(matched);
                }
              }
            }

            break;
          case "track":
            var data = await spotifyApi.getTracks([musicID]);
            var tracks = data.body.tracks;

            for (var i = 0; i < tracks.length; i++) {
              var matched;
              try {
                var searched = await ytsr(
                  tracks[i].artists[0].name + " - " + tracks[i].name,
                  { limit: 100 }
                );
                var results = searched.items.filter(
                  x => x.type === "video" && x.duration.split(":").length < 3
                );
              } catch (err) {
                return console.error(err);
              }
              for (var s = 0; s < results.length; s++) {
                if (results.length == 0) break;
                if (isGoodMusicVideoContent(results[s])) {
                  var songLength = results[s].duration;
                  matched = {
                    title: tracks[i].name,
                    url: results[s].link,
                    type: 1,
                    spot: tracks[i].external_urls.spotify,
                    thumbnail: tracks[i].album.images[0].url,
                    time: songLength
                  };
                  songs.push(matched);
                  break;
                }
                if (s + 1 == results.length) {
                  var songLength = results[0].duration;
                  matched = {
                    title: tracks[i].name,
                    url: results[0].link,
                    type: 1,
                    spot: tracks[i].external_urls.spotify,
                    thumbnail: tracks[i].album.images[0].url,
                    time: songLength
                  };
                  songs.push(matched);
                }
              }
              break;
            }
        }
      } else {
        try {
          var songInfo = await ytdl.getInfo(args[1]);
        } catch (err) {
          return message.channel.send("No video was found!");
        }
        var length = parseInt(songInfo.length_seconds);
        var songLength = moment.duration(length, "seconds").format();
        var songs = [
          {
            title: decodeHtmlEntity(songInfo.title),
            url: songInfo.video_url,
            type: 0,
            time: songLength,
            thumbnail: `https://img.youtube.com/vi/${songInfo.video_id}/maxresdefault.jpg`
          }
        ];
      }

      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
          paused: false
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs = songs;

        try {
          pool.getConnection(function(err, con) {
            con.query(
              "UPDATE servers SET queue = '" +
                escape(JSON.stringify(queueContruct.songs)) +
                "' WHERE id = " +
                message.guild.id,
              function(err, result) {
                if (err)
                  return message.reply(
                    "there was an error trying to execute that command!"
                  );
                console.log("Updated song queue of " + message.guild.name);
              }
            );
            con.release();
          });
          var connection = await voiceChannel.join();
          queueContruct.connection = connection;

          play(
            message.guild,
            queueContruct.songs[0],
            looping,
            queue,
            pool,
            repeat
          );

          const Embed = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("Now playing:")
            .setThumbnail(songs[0].type === 2 ? undefined : songs[0].thumbnail)
            .setDescription(
              `**[${songs[0].title}](${songs[0].url})**\nLength: **${songs[0].time}**`
            )
            .setTimestamp()
            .setFooter(
              "Have a nice day! :)",
              message.client.user.displayAvatarURL()
            );
          if (songs.length > 1)
            Embed.setDescription(
              `**${songs.length}** tracks were added.`
            ).setThumbnail(undefined);
          else if (songs[0].type === 1)
            Embed.setDescription(
              `**[${songs[0].title}](${songs[0].spot})**\nLength: **${songs[0].time}**`
            ).setThumbnail(songs[0].thumbnail);
          message.channel.send(Embed);
        } catch (err) {
          console.log(err);
          queue.delete(message.guild.id);
          return message.channel.send(err);
        }
      } else {
        for (var i = 0; i < songs.length; i++) serverQueue.songs.push(songs[i]);

        pool.getConnection(function(err, con) {
          con.query(
            "UPDATE servers SET queue = '" +
              escape(JSON.stringify(serverQueue.songs)) +
              "' WHERE id = " +
              message.guild.id,
            function(err, result) {
              if (err)
                return message.reply(
                  "there was an error trying to execute that command!"
                );
              console.log("Updated song queue of " + message.guild.name);
            }
          );
          con.release();
        });

        if (!message.guild.me.voice.channel) {
          var connection = await voiceChannel.join();
          serverQueue.voiceChannel = voiceChannel;
          serverQueue.connection = connection;
          serverQueue.playing = true;
          serverQueue.textChannel = message.channel;
          play(
            message.guild,
            serverQueue.songs[0],
            looping,
            queue,
            pool,
            repeat
          );
        } else if (serverQueue.playing === false) {
          play(
            message.guild,
            serverQueue.songs[0],
            looping,
            queue,
            pool,
            repeat
          );
        }
        var Embed = new Discord.MessageEmbed()
          .setColor(color)
          .setTitle("New track added:")
          .setThumbnail(songs[0].type === 2 ? undefined : songs[0].thumbnail)
          .setDescription(
            `**[${songs[0].title}](${songs[0].url})**\nLength: **${songs[0].time}**`
          )
          .setTimestamp()
          .setFooter(
            "Have a nice day! :)",
            message.client.user.displayAvatarURL()
          );
        if (songs.length > 1)
          Embed.setDescription(
            `**${songs.length}** tracks were added.`
          ).setThumbnail(undefined);
        else if (songs[0].type === 1)
          Embed.setDescription(
            `**[${songs[0].title}](${songs[0].spot})**\nLength: **${songs[0].time}**`
          ).setThumbnail(songs[0].thumbnail);
        return message.channel.send(Embed);
      }
    } else {
      const Embed = new Discord.MessageEmbed()
        .setTitle("Search result of " + args.slice(1).join(" "))
        .setColor(color)
        .setTimestamp()
        .setFooter(
          "Choose your song, or ⏹ to cancel.",
          message.client.user.displayAvatarURL()
        );
      const results = [];
      var saved = [];
      var retries = 1;
      try {
        var searched = await ytsr(args.slice(1).join(" "), { limit: 10 });
        var video = searched.items.filter(x => x.type === "video");
      } catch (err) {
        console.error(err);
      }
      var num = 0;
      for (let i = 0; i < video.length; i++) {
        try {
          saved.push(video[i]);
          results.push(
            ++num +
              " - **[" +
              decodeHtmlEntity(video[i].title) +
              "](" +
              video[i].link +
              ")**"
          );
        } catch {
          --num;
        }
      }
      Embed.setDescription(results.join("\n"));
      message.channel
        .send(Embed)
        .then(async msg => {
          if (results[0]) {
            await msg.react("1️⃣");
          }
          if (results[1]) {
            await msg.react("2️⃣");
          }
          if (results[2]) {
            await msg.react("3️⃣");
          }
          if (results[3]) {
            await msg.react("4️⃣");
          }
          if (results[4]) {
            await msg.react("5️⃣");
          }
          if (results[5]) {
            await msg.react("6️⃣");
          }
          if (results[6]) {
            await msg.react("7️⃣");
          }
          if (results[7]) {
            await msg.react("8️⃣");
          }
          if (results[8]) {
            await msg.react("9️⃣");
          }
          if (results[9]) {
            await msg.react("🔟");
          }

          await msg.react("⏹");

          const filter = (reaction, user) => {
            return (
              [
                "1️⃣",
                "2️⃣",
                "3️⃣",
                "4️⃣",
                "5️⃣",
                "6️⃣",
                "7️⃣",
                "8️⃣",
                "9️⃣",
                "🔟",
                "⏹"
              ].includes(reaction.emoji.name) && user.id === message.author.id
            );
          };

          msg
            .awaitReactions(filter, { max: 1, time: 30000, error: ["time"] })
            .then(async collected => {
              const reaction = collected.first();
              if (reaction.emoji.name === "⏹") {
                msg.reactions.removeAll().catch(err => {
                  if (err.message == "Missing Permissions") {
                    msg.channel.send(
                      "Failed to remove reaction of my message due to missing permission."
                    );
                  }
                });
                const cancelled = new Discord.MessageEmbed()
                  .setColor(color)
                  .setTitle("Action cancelled.")
                  .setTimestamp()
                  .setFooter(
                    "Have a nice day! :)",
                    message.client.user.displayAvatarURL()
                  );

                return msg.edit(cancelled);
              }

              if (reaction.emoji.name === "1️⃣") {
                var s = 0;
              }

              if (reaction.emoji.name === "2️⃣") {
                var s = 1;
              }

              if (reaction.emoji.name === "3️⃣") {
                var s = 2;
              }

              if (reaction.emoji.name === "4️⃣") {
                var s = 3;
              }

              if (reaction.emoji.name === "5️⃣") {
                var s = 4;
              }

              if (reaction.emoji.name === "6️⃣") {
                var s = 5;
              }

              if (reaction.emoji.name === "7️⃣") {
                var s = 6;
              }

              if (reaction.emoji.name === "8️⃣") {
                var s = 7;
              }

              if (reaction.emoji.name === "9️⃣") {
                var s = 8;
              }

              if (reaction.emoji.name === "🔟") {
                var s = 9;
              }

              const chosenEmbed = new Discord.MessageEmbed()
                .setColor(color)
                .setTitle("Music chosen:")
                .setThumbnail(saved[s].thumbnail)
                .setDescription(
                  `**[${decodeHtmlEntity(saved[s].title)}](${saved[s].link})**`
                )
                .setTimestamp()
                .setFooter(
                  "Have a nice day :)",
                  message.client.user.displayAvatarURL()
                );

              msg.edit(chosenEmbed);
              msg.reactions.removeAll().catch(err => {
                if (err.message == "Missing Permissions") {
                  msg.channel.send(
                    "Failed to remove reaction of my message due to missing permission."
                  );
                }
              });
              var length = saved[s].duration;
              var song = {
                title: decodeHtmlEntity(saved[s].title),
                url: saved[s].link,
                type: 0,
                time: length,
                thumbnail: saved[s].thumbnail
              };

              if (!serverQueue) {
                const queueContruct = {
                  textChannel: message.channel,
                  voiceChannel: voiceChannel,
                  connection: null,
                  songs: [],
                  volume: 5,
                  playing: true,
                  paused: false
                };

                queue.set(message.guild.id, queueContruct);

                await queueContruct.songs.push(song);
                pool.getConnection(function(err, con) {
                  con.query(
                    "UPDATE servers SET queue = '" +
                      escape(JSON.stringify(queueContruct.songs)) +
                      "' WHERE id = " +
                      message.guild.id,
                    function(err, result) {
                      if (err)
                        return message.reply(
                          "there was an error trying to execute that command!"
                        );
                      console.log(
                        "Updated song queue of " + message.guild.name
                      );
                    }
                  );
                  con.release();
                });
                try {
                  var connection = await voiceChannel.join();
                  queueContruct.connection = connection;

                  play(
                    message.guild,
                    queueContruct.songs[0],
                    looping,
                    queue,
                    pool,
                    repeat
                  );
                  const Embed = new Discord.MessageEmbed()
                    .setColor(color)
                    .setTitle("Now playing:")
                    .setThumbnail(song.thumbnail)
                    .setDescription(
                      `**[${song.title}](${song.url})**\nLength: **${song.time}**`
                    )
                    .setTimestamp()
                    .setFooter(
                      "Have a nice day! :)",
                      message.client.user.displayAvatarURL()
                    );
                  msg.edit(Embed);
                } catch (err) {
                  console.log(err);
                  queue.delete(message.guild.id);
                  return console.error(err);
                }
              } else {
                await serverQueue.songs.push(song);
                pool.getConnection(function(err, con) {
                  if (err)
                    return message.reply(
                      "there was an error trying to execute that command!"
                    );
                  con.query(
                    "UPDATE servers SET queue = '" +
                      escape(JSON.stringify(serverQueue.songs)) +
                      "' WHERE id = " +
                      message.guild.id,
                    function(err, result) {
                      if (err)
                        return message.reply(
                          "there was an error trying to execute that command!"
                        );
                      console.log(
                        "Updated song queue of " + message.guild.name
                      );
                    }
                  );
                  con.release();
                });
                if (!message.guild.me.voice.channel) {
                  var connection = await voiceChannel.join();
                  serverQueue.voiceChannel = voiceChannel;
                  serverQueue.connection = connection;
                  serverQueue.playing = true;
                  serverQueue.textChannel = message.channel;
                  play(
                    message.guild,
                    serverQueue.songs[0],
                    looping,
                    queue,
                    pool,
                    repeat
                  );
                } else if (serverQueue.playing === false) {
                  play(
                    message.guild,
                    serverQueue.songs[0],
                    looping,
                    queue,
                    pool,
                    repeat
                  );
                }
                const Embed = new Discord.MessageEmbed()
                  .setColor(color)
                  .setTitle("New track added:")
                  .setThumbnail(song.thumbnail)
                  .setDescription(
                    `**[${song.title}](${song.url})**\nLength: **${song.time}**`
                  )
                  .setTimestamp()
                  .setFooter(
                    "Have a nice day! :)",
                    message.client.user.displayAvatarURL()
                  );
                return msg.edit(Embed);
              }
            })
            .catch(err => {
              const Ended = new Discord.MessageEmbed()
                .setColor(color)
                .setTitle("Action cancelled.")
                .setTimestamp()
                .setFooter(
                  "Have a nice day! :)",
                  message.client.user.displayAvatarURL()
                );
              msg.edit(Ended);
              msg.reactions.removeAll().catch(err => {
                if (err.message == "Missing Permissions") {
                  msg.channel.send(
                    "Failed to remove reaction of my message due to missing permission."
                  );
                }
              });
            });
        })
        .catch(err => {
          console.log("Failed to send Embed.");
          if (err.message === "Missing Permissions") {
            message.author.send("I cannot send my search results!");
          }
          console.error(err);
        });
    }
  },
  async play(guild, song, looping, queue, pool, repeat) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
      guild.me.voice.channel.leave();
      queue.delete(guild.id);
      pool.getConnection(function(err, con) {
        con.query(
          "UPDATE servers SET queue = NULL WHERE id = " + guild.id,
          function(err, result) {
            if (err) throw err;
            console.log("Updated song queue of " + guild.name);
          }
        );
        con.release();
      });
      return;
    }

    if (serverQueue.connection === null) return;

    var dispatcher;
    if (song.type === 2) {
      await request(song.url, (err, res) => {
        dispatcher = serverQueue.connection.play(res, {
          highWaterMark: 1 << 28
        });
        dispatcher
          .on("finish", async () => {
            dispatcher = null;
            const guildLoopStatus = looping.get(guild.id);
            const guildRepeatStatus = repeat.get(guild.id);
            console.log("Music ended! In " + guild.name);

            if (guildLoopStatus === true) {
              await serverQueue.songs.push(song);
            }
            if (guildRepeatStatus !== true) {
              await serverQueue.songs.shift();
            }

            pool.getConnection(function(err, con) {
              con.query(
                "UPDATE servers SET queue = '" +
                  escape(JSON.stringify(serverQueue.songs)) +
                  "' WHERE id = " +
                  guild.id,
                function(err, result) {
                  if (err) throw err;
                  console.log("Updated song queue of " + guild.name);
                }
              );
              con.release();
            });
            play(guild, serverQueue.songs[0], looping, queue, pool, repeat);
          })
          .on("error", error => {
            console.error(error);
          });
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
      });
    } else {
      dispatcher = serverQueue.connection.play(
        await ytdl(song.url, { highWaterMark: 1 << 28 }),
        { type: "opus" }
      );
      dispatcher
        .on("finish", async () => {
          dispatcher = null;
          const guildLoopStatus = looping.get(guild.id);
          const guildRepeatStatus = repeat.get(guild.id);
          console.log("Music ended! In " + guild.name);
          
          if (guildLoopStatus === true) {
            await serverQueue.songs.push(song);
          }
          if (guildRepeatStatus !== true) {
            await serverQueue.songs.shift();
          }

          pool.getConnection(function(err, con) {
            con.query(
              "UPDATE servers SET queue = '" +
                escape(JSON.stringify(serverQueue.songs)) +
                "' WHERE id = " +
                guild.id,
              function(err, result) {
                if (err) throw err;
                console.log("Updated song queue of " + guild.name);
              }
            );
            con.release();
          });
          play(guild, serverQueue.songs[0], looping, queue, pool, repeat);
        })
        .on("error", error => {
          console.error(error);
        });
      dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    }
  }
};
