"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = void 0;
const canvas_1 = require("canvas");
const cleverbot_free_1 = __importDefault(require("cleverbot-free"));
const discord_js_1 = require("discord.js");
const moment_1 = __importDefault(require("moment"));
require("moment-duration-format")(moment_1.default);
const giveaway_1 = require("../commands/miscellaneous/giveaway");
const poll_1 = require("../commands/miscellaneous/poll");
const role_message_1 = require("../commands/managements/role-message");
const function_1 = require("../function");
const music_1 = require("../helpers/music");
const NorthClient_1 = require("./NorthClient");
const fetch = require("fetch-retry")(require("node-fetch"), { retries: 5, retryDelay: (attempt) => Math.pow(2, attempt) * 1000 });
const filter = require("../helpers/filter");
class Handler {
    static setup(client) {
        new Handler(client);
    }
    constructor(client) {
        client.once("ready", () => this.ready(client));
        client.on("guildMemberAdd", member => this.guildMemberAdd(member));
        client.on("guildMemberRemove", member => this.guildMemberRemove(member));
        client.on("guildCreate", guild => this.guildCreate(guild));
        client.on("guildDelete", guild => this.guildDelete(guild));
        client.on("voiceStateUpdate", (oldState, newState) => this.voiceStateUpdate(oldState, newState));
        client.on("guildMemberUpdate", (oldMember, newMember) => this.guildMemberUpdate(oldMember, newMember));
        client.on("messageReactionAdd", (reaction, user) => this.messageReactionAdd(reaction, user));
        client.on("messageReactionRemove", (reaction, user) => this.messageReactionRemove(reaction, user));
        client.on("messageDelete", message => this.messageDelete(message));
        client.on("message", message => this.message(message));
    }
    messageLevel(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = NorthClient_1.NorthClient.storage;
            if (!message || !message.author || !message.author.id || !message.guild || message.author.bot)
                return;
            const exp = Math.round(function_1.getRandomNumber(5, 15) * (1 + message.content.length / 100));
            const sqlDate = function_1.jsDate2Mysql(new Date());
            storage.queries.push(new NorthClient_1.LevelData(message.author.id, message.guild.id, exp, sqlDate));
        });
    }
    preReady(_client) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    preRead(client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = NorthClient_1.NorthClient.storage;
            client.guilds.cache.forEach(g => g.fetchInvites().then(guildInvites => storage.guilds[g.id].invites = guildInvites).catch(() => { }));
            const [res] = yield con.query(`SELECT * FROM gtimer ORDER BY endAt ASC`);
            storage.log(`[${client.id}] Found ${res.length} guild timers`);
            res.forEach((result) => __awaiter(this, void 0, void 0, function* () {
                let endAfter = result.endAt.getTime() - Date.now();
                let mc = yield function_1.profile(result.mc);
                let username = "undefined";
                if (mc)
                    username = mc.name;
                let dc = `<@${result.user}>`;
                let rank = unescape(result.dc_rank);
                let title = `${dc} - ${rank} [${username}]`;
                function_1.setTimeout_(() => __awaiter(this, void 0, void 0, function* () {
                    let asuna = yield client.users.fetch("461516729047318529");
                    const conn = yield client.pool.getConnection();
                    try {
                        const [results] = yield conn.query(`SELECT id FROM gtimer WHERE user = '${result.user}' AND mc = '${result.mc}' AND dc_rank = '${result.dc_rank}'`);
                        if (results.length == 0)
                            return;
                        try {
                            asuna.send(title + " expired");
                            var user = yield client.users.fetch(result.user);
                            user.send(`Your rank **${rank}** in War of Underworld has expired.`);
                        }
                        catch (err) { }
                        yield conn.query(`DELETE FROM gtimer WHERE user = '${result.user}' AND mc = '${result.mc}' AND dc_rank = '${result.dc_rank}'`);
                        storage.log("A guild timer expired.");
                    }
                    catch (err) {
                        storage.error(err);
                    }
                    conn.release();
                }), endAfter);
            }));
            const [gtimers] = yield con.query(`SELECT * FROM gtimer ORDER BY endAt ASC`);
            storage.gtimers = gtimers;
            setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    var timerChannel = yield client.channels.fetch(process.env.TIME_LIST_CHANNEL);
                    var timerMsg = yield timerChannel.messages.fetch(process.env.TIME_LIST_ID);
                }
                catch (err) {
                    storage.error("Failed to fetch timer list message");
                    return;
                }
                try {
                    let now = Date.now();
                    let tmp = [];
                    for (const result of storage.gtimers) {
                        let mc = yield function_1.profile(result.mc);
                        let username = "undefined";
                        if (mc)
                            username = mc.name;
                        const str = result.user;
                        let dc = "0";
                        try {
                            var user = yield client.users.fetch(str);
                            dc = user.id;
                        }
                        catch (err) { }
                        let rank = unescape(result.dc_rank);
                        let title = `<@${dc}> - ${rank} [${username}]`;
                        let seconds = Math.round((result.endAt.getTime() - now) / 1000);
                        tmp.push({ title: title, time: function_1.duration(seconds) });
                    }
                    if (tmp.length <= 10) {
                        timerMsg.reactions.removeAll().catch(storage.error);
                        let description = "";
                        let num = 0;
                        for (const result of tmp)
                            description += `${++num}. ${result.title} : ${result.time}\n`;
                        const em = new discord_js_1.MessageEmbed()
                            .setColor(function_1.color())
                            .setTitle("Rank Expiration Timers")
                            .setDescription(description)
                            .setTimestamp()
                            .setFooter("This list updates every 30 seconds", client.user.displayAvatarURL());
                        timerMsg.edit({ content: "", embed: em });
                    }
                    else {
                        const allEmbeds = [];
                        for (let i = 0; i < Math.ceil(tmp.length / 10); i++) {
                            let desc = "";
                            for (let num = 0; num < 10; num++) {
                                if (!tmp[i + num])
                                    break;
                                desc += `${num + 1}. ${tmp[i + num].title} : ${tmp[i + num].time}\n`;
                            }
                            const em = new discord_js_1.MessageEmbed()
                                .setColor(function_1.color())
                                .setTitle(`Rank Expiration Timers [${i + 1}/${Math.ceil(tmp.length / 10)}]`)
                                .setDescription(desc)
                                .setTimestamp()
                                .setFooter("This list updates every 30 seconds", client.user.displayAvatarURL());
                            allEmbeds.push(em);
                        }
                        const filter = (reaction) => ["◀", "▶", "⏮", "⏭", "⏹"].includes(reaction.emoji.name);
                        var msg = yield timerMsg.edit({ content: "", embed: allEmbeds[0] });
                        var s = 0;
                        yield msg.react("⏮");
                        yield msg.react("◀");
                        yield msg.react("▶");
                        yield msg.react("⏭");
                        yield msg.react("⏹");
                        const collector = msg.createReactionCollector(filter, { time: 30000 });
                        collector.on("collect", function (reaction, user) {
                            reaction.users.remove(user.id);
                            switch (reaction.emoji.name) {
                                case "⏮":
                                    s = 0;
                                    msg.edit(allEmbeds[s]);
                                    break;
                                case "◀":
                                    s -= 1;
                                    if (s < 0)
                                        s = allEmbeds.length - 1;
                                    msg.edit(allEmbeds[s]);
                                    break;
                                case "▶":
                                    s += 1;
                                    if (s > allEmbeds.length - 1)
                                        s = 0;
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
                        collector.on("end", () => msg.reactions.removeAll().catch(storage.error));
                    }
                }
                catch (err) {
                    storage.error(err);
                }
            }), 30000);
        });
    }
    setPresence(client) {
        return __awaiter(this, void 0, void 0, function* () {
            client.user.setActivity("Sword Art Online Alicization", { type: "LISTENING" });
        });
    }
    readCurrency(_client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            const [r] = yield con.query("SELECT * FROM currency");
            for (const result of r) {
                try {
                    if (result.bank <= 0)
                        continue;
                    const newBank = Math.round((Number(result.bank) * 1.02 + Number.EPSILON) * 100) / 100;
                    yield con.query(`UPDATE currency SET bank = ${newBank} WHERE id = ${result.id}`);
                }
                catch (err) {
                    NorthClient_1.NorthClient.storage.error(err);
                }
            }
        });
    }
    readServers(client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = NorthClient_1.NorthClient.storage;
            var [results] = yield con.query("SELECT * FROM servers WHERE id = '622311594654695434'");
            const result = results[0];
            storage.guilds[result.id] = {};
            if (result.queue || result.looping || result.repeating) {
                var queue = [];
                try {
                    if (result.queue)
                        queue = JSON.parse(unescape(result.queue));
                }
                catch (err) {
                    storage.error(`Error parsing queue of ${result.id}`);
                }
                music_1.setQueue(result.id, queue, !!result.looping, !!result.repeating, client.pool);
            }
            if (result.prefix)
                storage.guilds[result.id].prefix = result.prefix;
            storage.guilds[result.id].token = result.token;
            storage.guilds[result.id].giveaway = unescape(result.giveaway);
            storage.guilds[result.id].welcome = {
                message: result.welcome,
                channel: result.wel_channel,
                image: result.wel_img,
                autorole: result.autorole
            };
            storage.guilds[result.id].leave = {
                message: result.leave_msg,
                channel: result.leave_channel
            };
            storage.guilds[result.id].boost = {
                message: result.boost_msg,
                channel: result.boost_channel
            };
            storage.log(`[${client.id}] Set ${results.length} configurations`);
        });
    }
    readRoleMsg(client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = NorthClient_1.NorthClient.storage;
            const [res] = yield con.query("SELECT * FROM rolemsg WHERE guild <> '622311594654695434' AND guild <> '819539026792808448' ORDER BY expiration");
            storage.log(`[${client.id}] ` + "Found " + res.length + " role messages.");
            storage.rm = res;
            res.forEach((result) => __awaiter(this, void 0, void 0, function* () { return role_message_1.expire({ pool: client.pool, client }, result.expiration - Date.now(), result.id); }));
        });
    }
    readGiveaways(client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            var [results] = yield con.query("SELECT * FROM giveaways WHERE guild = '622311594654695434' OR id = '819539026792808448' ORDER BY endAt ASC");
            NorthClient_1.NorthClient.storage.log(`[${client.id}] ` + "Found " + results.length + " giveaways");
            results.forEach((result) => __awaiter(this, void 0, void 0, function* () {
                var currentDate = Date.now();
                var millisec = result.endAt - currentDate;
                function_1.setTimeout_(() => __awaiter(this, void 0, void 0, function* () {
                    giveaway_1.endGiveaway(client.pool, client, result);
                }), millisec);
            }));
        });
    }
    readPoll(client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            var [results] = yield con.query("SELECT * FROM poll WHERE guild = '622311594654695434' OR guild = '819539026792808448' ORDER BY endAt ASC");
            NorthClient_1.NorthClient.storage.log(`[${client.id}] ` + "Found " + results.length + " polls.");
            results.forEach(result => {
                var currentDate = Date.now();
                var time = result.endAt - currentDate;
                function_1.setTimeout_(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        var channel = yield client.channels.fetch(result.channel);
                        var msg = yield channel.messages.fetch(result.id);
                        if (msg.deleted)
                            throw new Error("Deleted");
                    }
                    catch (err) {
                        yield client.pool.query("DELETE FROM poll WHERE id = " + result.id);
                    }
                    yield poll_1.endPoll(client, con, result.id, msg, null, result.title, result.author, result.options, result.color);
                }), time);
            });
        });
    }
    readNoLog(_client, con) {
        return __awaiter(this, void 0, void 0, function* () {
            var [results] = yield con.query("SELECT * FROM nolog");
            NorthClient_1.NorthClient.storage.noLog = results.map(x => x.id);
        });
    }
    ready(client) {
        return __awaiter(this, void 0, void 0, function* () {
            this.preReady(client);
            const storage = NorthClient_1.NorthClient.storage;
            const pool = client.pool;
            const id = client.id;
            storage.log(`[${id}] Ready!`);
            this.setPresence(client);
            const con = yield pool.getConnection();
            try {
                yield this.preRead(client, con);
                yield this.readCurrency(client, con);
                yield this.readServers(client, con);
                yield this.readRoleMsg(client, con);
                yield this.readGiveaways(client, con);
                yield this.readPoll(client, con);
                yield this.readNoLog(client, con);
            }
            catch (err) {
                storage.error(err);
            }
            ;
            con.release();
        });
    }
    preWelcomeImage(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            yield channel.send(new discord_js_1.MessageAttachment("https://cdn.discordapp.com/attachments/707639765607907358/737859171269214208/welcome.png"));
        });
    }
    guildMemberAdd(member) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const client = member.client;
            const storage = NorthClient_1.NorthClient.storage;
            const guild = member.guild;
            const pool = client.pool;
            if (member.user.bot)
                return;
            guild.fetchInvites().then((guildInvites) => __awaiter(this, void 0, void 0, function* () {
                const ei = storage.guilds[member.guild.id].invites;
                storage.guilds[member.guild.id].invites = guildInvites;
                const invite = guildInvites.find(i => !ei.get(i.code) || ei.get(i.code).uses < i.uses);
                if (!invite)
                    return;
                const inviter = yield client.users.fetch(invite.inviter.id);
                if (!inviter)
                    return;
                const allUserInvites = guildInvites.filter(i => i.inviter.id === inviter.id && i.guild.id === guild.id);
                const reducer = (a, b) => a + b;
                const uses = allUserInvites.map(i => i.uses ? i.uses : 0).reduce(reducer);
                if (storage.noLog.find(x => x === inviter.id))
                    return;
                try {
                    yield inviter.send(`You invited **${member.user.tag}** to the server **${guild.name}**! In total, you have now invited **${uses} users** to the server!\n(If you want to disable this message, use \`${client.prefix}invites toggle\` to turn it off)`);
                }
                catch (err) { }
            })).catch(() => { });
            try {
                const welcome = (_a = storage.guilds[guild.id]) === null || _a === void 0 ? void 0 : _a.welcome;
                if (!(welcome === null || welcome === void 0 ? void 0 : welcome.channel)) {
                    if (storage.guilds[guild.id])
                        return;
                    yield pool.query(`INSERT INTO servers (id, autorole, giveaway) VALUES ('${guild.id}', '[]', '${escape("🎉")}')`);
                    storage.guilds[guild.id] = {};
                    storage.log("Inserted record for " + guild.name);
                }
                else {
                    if (!welcome.channel)
                        return;
                    const channel = guild.channels.resolve(welcome.channel);
                    if (!channel || !channel.permissionsFor(guild.me).has(18432))
                        return;
                    if (welcome.message)
                        try {
                            const welcomeMessage = function_1.replaceMsgContent(welcome.message, guild, client, member, "welcome");
                            yield channel.send(welcomeMessage);
                        }
                        catch (err) {
                            storage.error(err);
                        }
                    if (welcome.image) {
                        var img = new canvas_1.Image();
                        img.onload = () => __awaiter(this, void 0, void 0, function* () {
                            var height = img.height;
                            var width = img.width;
                            const canvas = canvas_1.createCanvas(width, height);
                            const ctx = canvas.getContext("2d");
                            const applyText = (canvas, text) => {
                                const ctx = canvas.getContext("2d");
                                let fontSize = canvas.width / 12;
                                do {
                                    ctx.font = `regular ${(fontSize -= 5)}px "NotoSans", "free-sans", Arial`;
                                } while (ctx.measureText(text).width > canvas.width * 9 / 10);
                                return ctx.font;
                            };
                            const welcomeText = (canvas, text) => {
                                const ctx = canvas.getContext("2d");
                                let fontSize = canvas.width / 24;
                                do {
                                    ctx.font = `regular ${(fontSize -= 5)}px "NotoSans", "free-sans", Arial`;
                                } while (ctx.measureText(text).width > canvas.width * 3 / 4);
                                return ctx.font;
                            };
                            const avatar = yield canvas_1.loadImage(member.user.displayAvatarURL({ format: "png" }));
                            ctx.drawImage(img, 0, 0, width, height);
                            const txt = member.user.tag;
                            ctx.font = applyText(canvas, txt);
                            ctx.strokeStyle = "black";
                            ctx.lineWidth = canvas.width / 102.4;
                            ctx.strokeText(txt, canvas.width / 2 - ctx.measureText(txt).width / 2, (canvas.height * 3) / 4);
                            ctx.fillStyle = "#ffffff";
                            ctx.fillText(txt, canvas.width / 2 - ctx.measureText(txt).width / 2, (canvas.height * 3) / 4);
                            const welcome = "Welcome to the server!";
                            ctx.font = welcomeText(canvas, welcome);
                            ctx.strokeStyle = "black";
                            ctx.lineWidth = canvas.width / 204.8;
                            ctx.strokeText(welcome, canvas.width / 2 - ctx.measureText(welcome).width / 2, (canvas.height * 6) / 7);
                            ctx.fillStyle = "#ffffff";
                            ctx.fillText(welcome, canvas.width / 2 - ctx.measureText(welcome).width / 2, (canvas.height * 6) / 7);
                            ctx.beginPath();
                            ctx.lineWidth = canvas.width / 51.2;
                            ctx.arc(canvas.width / 2, canvas.height / 3, canvas.height / 5, 0, Math.PI * 2, true);
                            ctx.closePath();
                            ctx.strokeStyle = "#dfdfdf";
                            ctx.stroke();
                            ctx.clip();
                            ctx.drawImage(avatar, canvas.width / 2 - canvas.height / 5, canvas.height / 3 - canvas.height / 5, canvas.height / 2.5, canvas.height / 2.5);
                            var attachment = new discord_js_1.MessageAttachment(canvas.toBuffer(), "welcome-image.png");
                            try {
                                yield this.preWelcomeImage(channel);
                                yield channel.send(attachment);
                            }
                            catch (err) {
                                storage.error(err);
                            }
                        });
                        var url = welcome.image;
                        try {
                            let urls = JSON.parse(welcome.image);
                            if (Array.isArray(urls))
                                url = urls[Math.floor(Math.random() * urls.length)];
                        }
                        catch (err) { }
                        img.src = url;
                    }
                }
                if (welcome && welcome.autorole !== "[]") {
                    const roleArray = JSON.parse(welcome.autorole);
                    for (var i = 0; i < roleArray.length; i++) {
                        const roleID = roleArray[i];
                        var role = undefined;
                        if (isNaN(parseInt(roleID)))
                            role = yield guild.roles.cache.find(x => x.name === roleID);
                        else
                            role = yield guild.roles.fetch(roleID);
                        if (!role)
                            continue;
                        try {
                            yield member.roles.add(roleID);
                        }
                        catch (err) {
                            storage.error(err);
                        }
                    }
                }
            }
            catch (err) {
                storage.error(err);
            }
            ;
        });
    }
    guildMemberRemove(member) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const client = member.client;
            const guild = member.guild;
            const storage = NorthClient_1.NorthClient.storage;
            try {
                const leave = (_a = storage.guilds[guild.id]) === null || _a === void 0 ? void 0 : _a.leave;
                if (!(leave === null || leave === void 0 ? void 0 : leave.channel)) {
                    if (storage.guilds[guild.id])
                        return;
                    yield client.pool.query(`INSERT INTO servers (id, autorole, giveaway) VALUES ('${guild.id}', '[]', '${escape("🎉")}')`);
                    storage.guilds[guild.id] = {};
                    storage.log("Inserted record for " + guild.name);
                }
                else {
                    if (guild.me.hasPermission(128)) {
                        const fetchedLogs = yield guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_KICK' });
                        const kickLog = fetchedLogs.entries.first();
                        if (kickLog && kickLog.target.id === member.user.id && kickLog.executor.id !== kickLog.target.id)
                            return;
                    }
                    else
                        storage.log("Can't view audit logs of " + guild.name);
                    const channel = guild.channels.resolve(leave.channel);
                    if (!channel || !channel.permissionsFor(guild.me).has(18432))
                        return;
                    if (!leave.message)
                        return;
                    try {
                        const leaveMessage = function_1.replaceMsgContent(leave.message, guild, client, member, "leave");
                        yield channel.send(leaveMessage);
                    }
                    catch (err) {
                        storage.error(err);
                    }
                }
            }
            catch (err) {
                storage.error(err);
            }
            ;
        });
    }
    guildCreate(guild) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = guild.client;
            const storage = NorthClient_1.NorthClient.storage;
            storage.log("Joined a new guild: " + guild.name);
            try {
                storage.guilds[guild.id].invites = yield guild.fetchInvites();
            }
            catch (err) { }
            try {
                const con = yield client.pool.getConnection();
                const [result] = yield con.query("SELECT * FROM servers WHERE id = " + guild.id);
                if (result.length > 0)
                    storage.log("Found row inserted for this server before. Cancelling row insert...");
                else {
                    yield con.query(`INSERT INTO servers (id, autorole, giveaway) VALUES ('${guild.id}', '[]', '${escape("🎉")}')`);
                    storage.guilds[guild.id] = {};
                    storage.log("Inserted record for " + guild.name);
                }
                con.release();
            }
            catch (err) {
                storage.error(err);
            }
        });
    }
    guildDelete(guild) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = guild.client;
            const storage = NorthClient_1.NorthClient.storage;
            storage.log("Left a guild: " + guild.name);
            delete storage.guilds[guild.id];
            try {
                yield client.pool.query("DELETE FROM servers WHERE id=" + guild.id);
                storage.log("Deleted record for " + guild.name);
            }
            catch (err) {
                storage.error(err);
            }
        });
    }
    voiceStateUpdate(oldState, newState) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const guild = oldState.guild || newState.guild;
            const client = guild.client;
            const storage = NorthClient_1.NorthClient.storage;
            const exit = (_a = storage.guilds[guild.id]) === null || _a === void 0 ? void 0 : _a.exit;
            if ((oldState.id == guild.me.id || newState.id == guild.me.id) && (!((_b = guild.me.voice) === null || _b === void 0 ? void 0 : _b.channel)))
                return yield music_1.stop(guild);
            if (!((_c = guild.me.voice) === null || _c === void 0 ? void 0 : _c.channel) || (newState.channelID !== guild.me.voice.channelID && oldState.channelID !== guild.me.voice.channelID))
                return;
            if (!storage.guilds[guild.id]) {
                yield client.pool.query(`INSERT INTO servers (id, autorole, giveaway) VALUES ('${guild.id}', '[]', '${escape("🎉")}')`);
                storage.guilds[guild.id] = {};
                storage.log("Inserted record for " + guild.name);
            }
            if (guild.me.voice.channel.members.size <= 1) {
                if (exit)
                    return;
                storage.guilds[guild.id].exit = true;
                setTimeout(() => { var _a; return ((_a = storage.guilds[guild.id]) === null || _a === void 0 ? void 0 : _a.exit) ? music_1.stop(guild) : 0; }, 30000);
            }
            else
                storage.guilds[guild.id].exit = false;
        });
    }
    guildMemberUpdate(oldMember, newMember) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const client = (oldMember.client || newMember.client);
            const storage = NorthClient_1.NorthClient.storage;
            if (oldMember.premiumSinceTimestamp || !newMember.premiumSinceTimestamp)
                return;
            const boost = (_a = storage.guilds[newMember.guild.id]) === null || _a === void 0 ? void 0 : _a.boost;
            if (!(boost === null || boost === void 0 ? void 0 : boost.channel) || !boost.message)
                return;
            try {
                const channel = yield client.channels.fetch(boost.channel);
                channel.send(boost.message.replace(/\{user\}/gi, `<@${newMember.id}>`));
            }
            catch (err) { }
        });
    }
    messageReactionAdd(r, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = NorthClient_1.NorthClient.storage;
            var roleMessage = storage.rm.find(x => x.id == r.message.id);
            if (!roleMessage)
                return;
            const emojis = JSON.parse(roleMessage.emojis);
            var index = -1;
            if (emojis.includes(r.emoji.id))
                index = emojis.indexOf(r.emoji.id);
            else if (emojis.includes(r.emoji.name))
                index = emojis.indexOf(r.emoji.name);
            else
                return;
            try {
                const guild = yield user.client.guilds.fetch(roleMessage.guild);
                const member = yield guild.members.fetch(user.id);
                if (index > -1)
                    yield member.roles.add(JSON.parse(roleMessage.roles)[index]);
            }
            catch (err) {
                storage.error(err);
            }
        });
    }
    messageReactionRemove(r, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = NorthClient_1.NorthClient.storage;
            var roleMessage = storage.rm.find(x => x.id == r.message.id);
            if (!roleMessage)
                return;
            const emojis = JSON.parse(roleMessage.emojis);
            var index = -1;
            if (emojis.includes(r.emoji.id))
                index = emojis.indexOf(r.emoji.id);
            else if (emojis.includes(r.emoji.name))
                index = emojis.indexOf(r.emoji.name);
            else
                return;
            try {
                const guild = yield r.message.client.guilds.fetch(roleMessage.guild);
                const member = yield guild.members.fetch(user.id);
                if (index > -1)
                    yield member.roles.remove(JSON.parse(roleMessage.roles)[index]);
            }
            catch (err) {
                storage.error(err);
            }
        });
    }
    messageDelete(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = message.client;
            const storage = NorthClient_1.NorthClient.storage;
            var roleMessage = storage.rm.find(x => x.id === message.id);
            if (!roleMessage)
                return;
            storage.rm.splice(storage.rm.indexOf(roleMessage), 1);
            yield client.pool.query(`DELETE FROM rolemsg WHERE id = '${message.id}'`);
        });
    }
    preMessage(message) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const client = message.client;
            if (message.mentions.users.size > 10) {
                yield message.delete();
                const msg = yield message.reply("do not spam ping.");
                yield function_1.wait(3000);
                yield msg.delete();
                yield message.member.roles.set(["755263714940289125"]);
                return;
            }
            if (message.channel.id == "647630951169523762") {
                if (!message.content.match(/^\w{3,16}$/))
                    return;
                const mcName = message.content;
                NorthClient_1.NorthClient.storage.log("Received name: " + mcName);
                const dcUserID = message.author.id;
                const msg = yield message.channel.send("Processing...");
                const con = yield client.pool.getConnection();
                try {
                    const mcUuid = yield function_1.nameToUuid(mcName);
                    if (!mcUuid)
                        return yield msg.edit("Error finding that user!").then(msg => msg.delete({ timeout: 10000 }));
                    NorthClient_1.NorthClient.storage.log("Found UUID: " + mcUuid);
                    var res;
                    try {
                        res = yield fetch(`https://api.slothpixel.me/api/players/${mcUuid}?key=${process.env.API}`).then(res => res.json());
                    }
                    catch (err) {
                        return yield msg.edit("The Hypixel API is down.").then(msg => msg.delete({ timeout: 10000 }));
                    }
                    const hyDc = (_a = res.links) === null || _a === void 0 ? void 0 : _a.DISCORD;
                    if (!hyDc || hyDc !== message.author.tag)
                        return yield msg.edit("This Hypixel account is not linked to your Discord account!").then(msg => msg.delete({ timeout: 10000 }));
                    var [results] = yield con.query(`SELECT * FROM dcmc WHERE dcid = '${dcUserID}'`);
                    if (results.length == 0) {
                        yield con.query(`INSERT INTO dcmc VALUES(NULL, '${dcUserID}', '${mcUuid}')`);
                        msg.edit("Added record! This message will be auto-deleted in 10 seconds.").then(msg => msg.delete({ timeout: 10000 }));
                        NorthClient_1.NorthClient.storage.log("Inserted record for mc-name.");
                    }
                    else {
                        yield con.query(`UPDATE dcmc SET uuid = '${mcUuid}' WHERE dcid = '${dcUserID}'`);
                        msg.edit("Updated record! This message will be auto-deleted in 10 seconds.").then(msg => msg.delete({ timeout: 10000 }));
                        NorthClient_1.NorthClient.storage.log("Updated record for mc-name.");
                    }
                    const mcLen = res.username.length + 1;
                    const bw = res.stats.BedWars;
                    const firstHalf = `[${bw.level}⭐|${bw.final_k_d}]`;
                    if (firstHalf.length + mcLen > 32)
                        yield message.member.setNickname(`${firstHalf} ${res.username.slice(0, 28 - firstHalf.length)}...`);
                    else
                        yield message.member.setNickname(`${firstHalf} ${res.username}`);
                    const gInfo = yield fetch(`https://api.slothpixel.me/api/guilds/${mcUuid}?key=${process.env.API}`).then(res => res.json());
                    const roles = message.member.roles;
                    if (gInfo.id === "5b25306a0cf212fe4c98d739")
                        yield roles.add("622319008758104064");
                    yield roles.add("676754719120556042");
                    yield roles.add("837345908697989171");
                    yield roles.remove("837345919010603048");
                    if (bw.level < 100)
                        yield roles.add("851471525802803220");
                    else if (bw.level < 200)
                        yield roles.add("851469005168181320");
                    else if (bw.level < 300)
                        yield roles.add("851469138647842896");
                    else if (bw.level < 400)
                        yield roles.add("851469218310389770");
                    else if (bw.level < 500)
                        yield roles.add("851469264664789022");
                    else if (bw.level < 600)
                        yield roles.add("851469323444944907");
                    else if (bw.level < 700)
                        yield roles.add("851469358076788766");
                    else if (bw.level < 800)
                        yield roles.add("851469389806829596");
                    else if (bw.level < 900)
                        yield roles.add("851469422971584573");
                    else if (bw.level < 1000)
                        yield roles.add("851469455791489034");
                    else if (bw.level < 1100)
                        yield roles.add("851469501115793408");
                    else if (bw.level < 1200)
                        yield roles.add("851469537030307870");
                    else if (bw.level < 1300)
                        yield roles.add("851469565287858197");
                    else if (bw.level < 1400)
                        yield roles.add("851469604840013905");
                    else if (bw.level < 1500)
                        yield roles.add("851469652940161084");
                    else if (bw.level < 1600)
                        yield roles.add("851469683764887572");
                    else if (bw.level < 1700)
                        yield roles.add("851469718955229214");
                    else if (bw.level < 1800)
                        yield roles.add("851469754677985280");
                    else if (bw.level < 1900)
                        yield roles.add("851469812050690068");
                    else if (bw.level < 2000)
                        yield roles.add("851469858675097660");
                    else if (bw.level < 2100)
                        yield roles.add("851469898547068938");
                    else if (bw.level < 2200)
                        yield roles.add("851469933606862848");
                    else if (bw.level < 2300)
                        yield roles.add("851469969685479424");
                    else if (bw.level < 2400)
                        yield roles.add("851470006520905748");
                    else if (bw.level < 2500)
                        yield roles.add("851470041031245854");
                    else if (bw.level < 2600)
                        yield roles.add("851470070022406204");
                    else if (bw.level < 2700)
                        yield roles.add("851470099558039622");
                    else if (bw.level < 2800)
                        yield roles.add("851470140410822677");
                    else if (bw.level < 2900)
                        yield roles.add("851470173503881218");
                    else if (bw.level < 3000)
                        yield roles.add("851470230370910248");
                    else
                        yield roles.add("851471153188569098");
                    yield roles.remove(["837271170717057065", "837271174827212850", "837271174073155594", "837271173027856404", "837271172319674378", "837271171619356692"]);
                    if (res.rank === "YOUTUBER")
                        yield roles.add("837271170717057065");
                    else if (res.rank === "VIP")
                        yield roles.add("837271174827212850");
                    else if (res.rank === "VIP_PLUS")
                        yield roles.add("837271174073155594");
                    else if (res.rank === "MVP")
                        yield roles.add("837271173027856404");
                    else if (res.rank === "MVP_PLUS")
                        yield roles.add("837271172319674378");
                    else if (res.rank === "MVP_PLUS_PLUS")
                        yield roles.add("837271171619356692");
                }
                catch (err) {
                    NorthClient_1.NorthClient.storage.error(err);
                    yield msg.edit("Error updating record! Please contact NorthWestWind#1885 to fix this.").then(msg => msg.delete({ timeout: 10000 }));
                }
                con.release();
                return;
            }
        });
    }
    message(message) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.preMessage(message);
            const client = message.client;
            const storage = NorthClient_1.NorthClient.storage;
            const msg = message;
            msg.prefix = client.prefix;
            if (msg.guild && ((_a = storage.guilds[msg.guild.id]) === null || _a === void 0 ? void 0 : _a.prefix))
                msg.prefix = storage.guilds[msg.guild.id].prefix;
            this.messageLevel(msg);
            const args = msg.content.slice(msg.prefix.length).split(/ +/);
            if (!msg.content.startsWith(msg.prefix) || msg.author.bot) {
                if (!msg.author.bot && Math.floor(Math.random() * 1000) === 69)
                    cleverbot_free_1.default(msg.content).then(response => msg.channel.send(response));
                return;
            }
            ;
            const commandName = args.shift().toLowerCase();
            const command = storage.commands.get(commandName) || storage.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (!command)
                return;
            msg.pool = client.pool;
            try {
                const catFilter = filter[require("../commands/information/help").sCategories.map(x => x.toLowerCase())[(command.category)]];
                if ((yield filter.all(command, msg, args)) && (catFilter ? yield catFilter(command, msg) : true))
                    yield command.execute(msg, args);
            }
            catch (error) {
                storage.error(command.name + ": " + error);
                yield msg.reply("there was an error trying to execute that command!\nIf it still doesn't work after a few tries, please contact NorthWestWind or report it on the support server.");
            }
        });
    }
}
exports.Handler = Handler;
