const { NorthClient } = require("./classes/NorthClient");

module.exports = {
  twoDigits(d) {
    if (0 <= d && d < 10) return "0" + d.toString();
    if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
    return d.toString();
  },
  SumArray: (arr) => arr.reduce((a, b) => a + b),
  setTimeout_(fn, delay) {
    var maxDelay = Math.pow(2, 31) - 1;
    if (delay > maxDelay) {
      var args = arguments;
      args[1] -= maxDelay;
      return setTimeout(() => this.setTimeout_.apply(fn, args), maxDelay);
    }
    return setTimeout.apply(fn, arguments);
  },
  validURL: (str) => !!str.match(/^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?.*)?(\#[-a-z\d_]*)?$/i),
  validYTURL: (str) => !!str.match(/^(https?:\/\/)?((w){3}.)?youtu(be|.be)?(.com)?\/.+/),
  validYTPlaylistURL: (str) => !!str.match(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(.com)?\/playlist\?list=\w+/),
  validSPURL: (str) => !!str.match(/^(spotify:|https:\/\/[a-z]+\.spotify\.com\/)/),
  validGDURL: (str) => !!str.match(/^(https?)?:\/\/drive\.google\.com\/(file\/d\/(?<id>.*?)\/(?:edit|view)\?usp=sharing|open\?id=(?<id1>.*?)$)/),
  validGDFolderURL: (str) => !!str.match(/^(https?)?:\/\/drive\.google\.com\/drive\/folders\/[\w\-]+(\?usp=sharing)?$/),
  validGDDLURL: (str) => !!str.match(/^(https?)?:\/\/drive\.google\.com\/uc\?export=download&id=[\w-]+/),
  validImgurURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?imgur.com\/(\w*\w*)+(\.[a-zA-Z]{3})?$/),
  validImgurVideoURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?imgur.com\/(\w*\w*)+(\.[a-zA-Z0-9]{3})?$/),
  validImgur4wordsURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?imgur.com\/(\w\/)?(\w*\w*)+(\.[a-zA-Z0-9]*)?$/),
  validImgurAURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?imgur.com\/(\w\/)?(\w*\w*)$/),
  validNotImgurURL: (str) => !!str.match(/^https?:\/\/imgur.com\/(\w*\w*)+(\.[a-zA-Z]{3})?$/),
  validRedditURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?redd.it\/(\w*\w*)+(\.[a-zA-Z]{3})?$/),
  validRedditVideoURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?redd.it\/(\w*\w*)+(\.[a-zA-Z0-9]{3})?$/),
  validGfyURL: (str) => !!str.match(/^(http(s)?:\/\/)?((w){3}.)?gfycat(.com)?\/\w*/),
  validRedGifURL: (str) => !!str.match(/^https?:\/\/(\w+\.)?redgifs.com\/(\w*\/)?(\w*\w*)$/),
  validSCURL: (str) => !!str.match(/^https?:\/\/(soundcloud\.com|snd\.sc)\/(.+)?/),
  validMSURL: (str) => !!str.match(/^(https?:\/\/)?musescore\.com\/(user\/\d+\/scores\/\d+|[\w-]+\/(scores\/\d+|[\w-]+))[#\?]?$/),
  validPHURL: (str) => !!str.match(/^(https?:\/\/)(\w+\.)?pornhub\.com\/view_video\.php\?viewkey=\w+\/?$/),
  decodeHtmlEntity: (str) => str.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec)).replace(/&quot;/g, `"`).replace(/&amp;/g, `&`),
  encodeHtmlEntity(str) {
    const buf = [];
    for (var i = str.length - 1; i >= 0; i--) buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    return buf.join("");
  },
  shuffleArray(array, start = 0) {
    const temp = array.splice(0, start);
    var i;
    var j;
    var x;
    for (i = array.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = array[i];
      array[i] = array[j];
      array[j] = x;
    }
    array = temp.concat(array);
    return array;
  },
  moveArray(array, index) {
    const a1 = array.splice(0, index);
    return array.concat(a1);
  },
  async findUser(message, str) {
    if (isNaN(parseInt(str))) if (!str.startsWith("<@")) {
      await message.channel.send("**" + str + "** is neither a mention or ID.");
      return;
    }
    const userID = str.replace(/<@/g, "").replace(/!/g, "").replace(/>/g, "");
    try {
      return await message.client.users.fetch(userID);
    } catch (err) {
      await message.channel.send("No user was found!");
    }
    return;
  },
  async findMember(message, str) {
    if (isNaN(parseInt(str))) if (!str.startsWith("<@")) {
      await message.channel.send("**" + str + "** is neither a mention or ID.");
      return;
    }
    const userID = str.replace(/<@/g, "").replace(/!/g, "").replace(/>/g, "");
    try {
      return await message.guild.members.fetch(userID);
    } catch (err) {
      await message.channel.send("No user was found!");
    }
    return;
  },
  async findRole(message, str, suppress = false) {
    var roleID = str.replace(/<@&/g, "").replace(/>/g, "");
    if (isNaN(parseInt(roleID))) {
      var role = await message.guild.roles.cache.find(x => x.name.toLowerCase() === str);
      if (!role) {
        if (!suppress) await message.channel.send("No role was found with the name " + str);
        return null;
      }
    } else {
      var role = await message.guild.roles.cache.get(roleID);
      if (!role) {
        if (!suppress) await message.channel.send("No role was found!");
        return null;
      }
    }
    return role;
  },
  getRandomNumber: (min, max) => Math.random() * (max - min) + min,
  applyText(canvas, text) {
    const ctx = canvas.getContext("2d");
    var fontSize = canvas.width / 12;
    do ctx.font = `${(fontSize -= 5)}px sans-serif`;
    while (ctx.measureText(text).width > canvas.width - 100);
    return ctx.font;
  },
  numberWithCommas(x) {
    x = x.toString();
    const pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
    return x;
  },
  isGoodMusicVideoContent(videoSearchResultItem) {
    const contains = (string, content) => !!~(string || "").indexOf(content);
    return (contains(videoSearchResultItem.author ? videoSearchResultItem.author.name : undefined, "VEVO") || contains(videoSearchResultItem.author ? videoSearchResultItem.author.name.toLowerCase() : undefined, "official") || contains(videoSearchResultItem.title.toLowerCase(), "official") || !contains(videoSearchResultItem.title.toLowerCase(), "extended"));
  },
  elegantPair: (x, y) => x >= y ? x * x + x + y : y * y + x,
  elegantUnpair(z) {
    const sqrtz = Math.floor(Math.sqrt(z)), sqz = sqrtz * sqrtz;
    return z - sqz >= sqrtz ? [sqrtz, z - sqz - sqrtz] : [z - sqz, sqrtz];
  },
  jsDate2Mysql(newDate) {
    function twoDigits(d) {
      if (0 <= d && d < 10) return "0" + d.toString();
      if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
      return d.toString();
    }
    var date = newDate.getDate();
    var month = newDate.getMonth();
    var year = newDate.getFullYear();
    var hour = newDate.getHours();
    var minute = newDate.getMinutes();
    var second = newDate.getSeconds();
    var newDateSql =
      year +
      "-" +
      twoDigits(month + 1) +
      "-" +
      twoDigits(date) +
      " " +
      twoDigits(hour) +
      ":" +
      twoDigits(minute) +
      ":" +
      twoDigits(second);
    return newDateSql;
  },
  getWithWeight(input) {
    const array = [];
    for (const item in input) if (input.hasOwnProperty(item)) for (var i = 0; i < input[item]; i++) array.push(item);
    return array[Math.floor(Math.random() * array.length)];
  },
  hexToRgb(hex) {
    hex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_m, r, g, b) => (r + r + g + g + b + b));

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  decimalToRgb: (decimal) => ({
    r: (decimal >> 16) & 0xff,
    g: (decimal >> 8) & 0xff,
    b: decimal & 0xff,
  }),
  readableDate: (date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear}`,
  readableDateTime(date) {
    function twoDigits(d) {
      if (0 <= d && d < 10) return "0" + d.toString();
      if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
      return d.toString();
    }
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    var dateTime =
      twoDigits(day) +
      "/" +
      twoDigits(month + 1) +
      "/" +
      twoDigits(year) +
      " " +
      twoDigits(hour) +
      ":" +
      twoDigits(minute) +
      ":" +
      twoDigits(second) +
      " UTC";
    return dateTime;
  },
  readableDateTimeText(time) {
    var sec = time / 1000;
    var dd = Math.floor(sec / 86400);
    var dh = Math.floor((sec % 86400) / 3600);
    var dm = Math.floor(((sec % 86400) % 3600) / 60);
    var ds = Math.floor(((sec % 86400) % 3600) % 60);
    var dmi = Math.floor(time - dd * 86400000 - dh * 3600000 - dm * 60000 - ds * 1000);
    var d = "";
    var h = "";
    var m = "";
    var s = "";
    var mi = "";
    if (dd !== 0) d = " " + dd + " days";
    if (dh !== 0) h = " " + dh + " hours";
    if (dm !== 0) m = " " + dm + " minutes";
    if (ds !== 0) s = " " + ds + " seconds";
    if (dmi !== 0) mi = " " + dmi + " milliseconds";
    return d + h + m + s + mi;
  },
  ms(val, options) {
    const superms = require("ms");
    if (typeof val === "string" && superms(val) === undefined) {
      if (val.split(":").length > 1) {
        const nums = val.split(":").reverse();
        const units = ["s", "m", "h", "d"];
        const mses = [];
        for (const num of nums) {
          const str = `${parseInt(num)}${units[nums.indexOf(num)]}`;
          const parsed = superms(str);
          if (parsed === undefined) return undefined;
          mses.push(parsed);
        }
        return mses.reduce((acc, c) => acc + c);
      }
      var mses = [];
      let temp = "";
      let last = "";
      for (let i = 0; i < val.length; i++) {
        let char = val.substr(i, 1);
        if (!/\d/.test(last) && /\d/.test(char) && i != 0) {
          if (superms(temp) === undefined) return undefined;
          mses.push(superms(temp));
          temp = "";
        }
        temp += char;
        if (val[i + 1] === undefined) mses.push(superms(temp));
      }
      return mses.reduce((acc, c) => acc + c);
    } else return superms(val, options);
  },
  findValueByPrefix(object, prefix) {
    for (const property in object) if (object[property] && property.toString().startsWith(prefix)) return object[property];
    return undefined;
  },
  isEquivalent(a, b) {
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);
    if (aProps.length != bProps.length) return false;
    for (var i = 0; i < aProps.length; i++) {
      var propName = aProps[i];
      if (a[propName] !== b[propName]) return false;
    }
    return true;
  },
  ID: async () => {
    const buffer = await new Promise((resolve, reject) => require("crypto").randomBytes(24, async (err, buffer) => err ? reject(err) : resolve(buffer)));
    return buffer.toString("hex");
  },
  async createEmbedScrolling(message, allEmbeds, id = 0, additionalData = undefined) {
    const filter = (reaction, user) => (["◀", "▶", "⏮", "⏭", "⏹"].includes(reaction.emoji.name) && user.id === message.author.id);
    var s = 0;
    var msg = await message.channel.send(allEmbeds[0]);
    await msg.react("⏮");
    await msg.react("◀");
    await msg.react("▶");
    await msg.react("⏭");
    await msg.react("⏹");
    const collector = await msg.createReactionCollector(filter, { idle: 60000 });
    collector.on("collect", function (reaction, user) {
      reaction.users.remove(user.id);
      switch (reaction.emoji.name) {
        case "⏮":
          s = 0;
          msg.edit(allEmbeds[s]);
          break;
        case "◀":
          s -= 1;
          if (s < 0) {
            s = allEmbeds.length - 1;
          }
          msg.edit(allEmbeds[s]);
          break;
        case "▶":
          s += 1;
          if (s > allEmbeds.length - 1) {
            s = 0;
          }
          msg.edit(allEmbeds[s]);
          break;
        case "⏭":
          s = allEmbeds.length - 1;
          msg.edit(allEmbeds[s]);
          break;
        case "⏹":
          collector.emit("end");
          break;
      }
    });
    collector.on("end", async () => {
      msg.reactions.removeAll().catch(NorthClient.storage.error);
      if (id == 1) {
        await msg.edit({ content: "Loading simplier version...", embed: null });
        await msg.edit("https://sky.shiiyu.moe/stats/" + additionalData.res[0].name);
      } else if (id == 2) setTimeout(() => msg.edit({ embed: null, content: `**[Lyrics of ${title}**]` }), 10000);
      else if (id == 3) setTimeout(() => msg.edit({ embed: null, content: `**[Queue: ${additionalData.songArray.length} tracks in total]**` }), 60000);
    });
    return { msg: msg, collector: collector };
  },
  async commonCollectorListener(reaction, user, s, allEmbeds, msg, collector) {
    reaction.users.remove(user.id);
    switch (reaction.emoji.name) {
      case "⏮":
        s = 0;
        await msg.edit(allEmbeds[s]);
        break;
      case "◀":
        s -= 1;
        if (s < 0) s = allEmbeds.length - 1;
        await msg.edit(allEmbeds[s]);
        break;
      case "▶":
        s += 1;
        if (s > allEmbeds.length - 1) s = 0;
        await msg.edit(allEmbeds[s]);
        break;
      case "⏭":
        s = allEmbeds.length - 1;
        await msg.edit(allEmbeds[s]);
        break;
      case "⏹":
        collector.emit("end");
        break;
    }
    return { s, msg };
  },
  streamToString(stream, enc) {
    var str = ''
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => str += (typeof enc === 'string') ? data.toString(enc) : data.toString());
      stream.on('end', () => resolve(str));
      stream.on('error', (err) => reject(err));
    })
  },
  genPermMsg(permissions, id) {
    const Discord = require("discord.js");
    if (id == 0) return `You need the permissions \`${new Discord.Permissions(permissions).toArray().join("`, `")}\` to use this command.`;
    else return `I need the permissions \`${new Discord.Permissions(permissions).toArray().join("`, `")}\` to run this command.`;
  },
  color: () => Math.floor(Math.random() * 16777214) + 1,
  replaceMsgContent(msg, guild, client, member, flag) {
    const splitMessage = msg.split(" ");
    const messageArray = [];
    for (const word of splitMessage) {
      if (word.match(/^\{\#\w+\}$/)) {
        const str = word.replace(/[\{\#\}]/g, "");
        if (isNaN(parseInt(str))) {
          const mentionedChannel = guild.channels.find(x => x.name === str);
          if (!mentionedChannel) messageArray.push("#" + str);
          else messageArray.push(mentionedChannel);
        } else {
          const mentionedChannel = guild.channels.resolve(str);
          if (!mentionedChannel) messageArray.push("<#" + str + ">");
          else messageArray.push(mentionedChannel);
        }
      } else if (word.match(/^\{\@\&\w+\}$/)) {
        const str = word.replace(/[\{\@\&\}]/g, "");
        if (isNaN(parseInt(str))) {
          const mentionedRole = guild.roles.find(x => x.name === str);
          if (!mentionedRole) messageArray.push("@" + str);
          else messageArray.push(mentionedRole);
        } else {
          const mentionedRole = guild.roles.get(str);
          if (!mentionedRole) messageArray.push("<@&" + str + ">");
          else messageArray.push(mentionedRole);
        }
      } else if (word.match(/^\{\@\w+\}$/)) {
        const str = word.replace(/[\{\@\}]/g, "");
        if (isNaN(parseInt(str))) {
          const mentionedUser = client.users.find(x => x.name === str);
          if (!mentionedUser) messageArray.push("@" + str);
          else messageArray.push(mentionedUser);
        } else {
          const mentionedUser = client.users.get(str);
          if (!mentionedUser) messageArray.push("<@" + str + ">");
          else messageArray.push(mentionedUser);
        }
      } else messageArray.push(word);
    }
    if (flag === "welcome") return messageArray.join(" ").replace(/\{user\}/ig, member);
    else if (flag === "leave") return messageArray.join(" ").replace(/\{user\}/ig, member.user.tag);
  },
  requestStream: async (url) => {
    const fetch = require("node-fetch").default;
    return await fetch(url).then(res => res.body);
  },
  capitalize: (s) => (typeof s !== 'string') ? '' : s.charAt(0).toUpperCase() + s.slice(1),
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  bufferToStream(buf, chunkSize) {
    const { Readable } = require("stream");
    if (typeof buf === 'string') buf = Buffer.from(buf, 'utf8');
    if (!Buffer.isBuffer(buf)) throw new TypeError(`"buf" argument must be a string or an instance of Buffer`);
    const reader = new Readable();
    const hwm = reader._readableState.highWaterMark;
    if (!chunkSize || typeof chunkSize !== 'number' || chunkSize < 1 || chunkSize > hwm) chunkSize = hwm;
    const len = buf.length;
    let start = 0;
    reader._read = () => {
      while (reader.push(buf.slice(start, (start += chunkSize)))) if (start >= len) {
        reader.push(null);
        break;
      }
    }
    return reader;
  },
  mergeObjArr(obj, keys) {
    const arr = [];
    for (const key of keys) if (obj[key]) arr.push(obj[key]);
    return [].concat.apply([], arr);
  },
  profile: (str) => new Promise((resolve, reject) => require("mojang-api").profile(str, function (err, res) { if (err) reject(err); else resolve(res); })),
  nameToUuid: (str, full = false) => new Promise((resolve, reject) => {
    const cb = function (err, res) { if (err) reject(err); else if (full) resolve(res); else resolve(res[0]?.id); }
    cb.error = (err) => NorthClient.storage.error(err);
    require("mojang-api").nameToUuid(str, cb);
  }),
  nameHistory: (str) => new Promise((resolve, reject) => require("mojang-api").nameHistory(str, function (err, res) { if (err) reject(err); else resolve(res); })),
  duration: (seconds) => {
    const moment = require("moment");
    require("moment-duration-format")(moment);
    return moment.duration(seconds, "seconds").format();
  },
  getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  },
  commonModerationEmbed(guild, author, member, word, past, reason) {
    const Discord = require("discord.js");
    const color = () => Math.floor(Math.random() * 16777214) + 1;
    const capitalize = (s) => (typeof s !== 'string') ? '' : s.charAt(0).toUpperCase() + s.slice(1);
    const notiEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle(`You've been ${past}`)
      .setDescription(`In **${guild.name}**`)
      .setTimestamp()
      .setFooter(`${capitalize(past)} by ${author.tag}`, author.displayAvatarURL());
    if (reason) notiEmbed.addField("Reason", reason);
    const successfulEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle(`User ${capitalize(past)}!`)
      .setDescription(`${capitalize(past)} **${member.user?.tag || member.tag}** in server **${guild.name}**.`);
    const failureEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle(`Failed to ${word} the user!`)
      .setDescription(`Couldn't ${word} **${member.user?.tag || member.tag}** in server **${guild.name}**.`);
    return [notiEmbed, successfulEmbed, failureEmbed];
  },
  commonRoleEmbed(client, word, past, name) {
    const Discord = require("discord.js");
    const color = () => Math.floor(Math.random() * 16777214) + 1;
    const capitalize = (s) => (typeof s !== 'string') ? '' : s.charAt(0).toUpperCase() + s.slice(1);
    const failEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle(`Failed to ${word} role`)
      .setDescription(`Failed to ${word} the role **${name}**`)
      .setTimestamp()
      .setFooter("Have a nice day! :)", client.user.displayAvatarURL());
    const successEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle(`Role ${past} Successfully`)
      .setDescription(`${capitalize(past)} a new role **${name}**`)
      .setTimestamp()
      .setFooter("Have a nice day! :)", client.user.displayAvatarURL());
    return [successEmbed, failEmbed];
  },
  async msgOrRes(message, str) {
    if (message) return await message.channel.send(str);
    else return InteractionResponse.sendMessage(str);
  },
  deepReaddir(dir) {
    const fs = require("fs");
    const path = require("path");
    var results = [];
    const list = fs.readdirSync(dir);
    var i = 0;
    function next() {
      var file = list[i++];
      if (!file) return results;
      file = path.resolve(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        const res = module.exports.deepReaddir(file);
        results = results.concat(res);
        return next();
      } else {
        results.push(file);
        return next();
      }
    };
    return next();
  },
  async xmlToJson(xml) {
    const { parseString } = require("xml2js");
    return new Promise((resolve, reject) => parseString(xml, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    }));
  },
  flatDeep(arr, d = 1) {
    return d > 0 ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val), [])
      : arr.slice();
  }
};
