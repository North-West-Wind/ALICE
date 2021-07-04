const Discord = require("discord.js");
const neko = require("akaneko");
const { ms, color } = require("../../function.js");

module.exports = {
  name: "hentai",
  description: "Return something very NSFW. Require NSFW channel.",
  usage: "[tag | subcommand]",
  aliases: ["h"],
  subcommands: ["auto"],
  subaliases: ["a"],
  subdesc: ["Automate Hentai images."],
  subusage: ["<subcommand> <amount> <interval> [reverse] [tags]"],
  tags: [
    "ass",
    "bdsm",
    "blowjob",
    "cum",
    "doujin",
    "feet",
    "femdom",
    "foxgirl",
    "gifs",
    "glasses",
    "hentai",
    "netorare",
    "loli",
    "maid",
    "masturbation",
    "orgy",
    "panties",
    "pussy",
    "school",
    "tentacles",
    "thighs",
    "uglyBastard",
    "uniform",
    "yuri",
    "zettaiRyouiki",
    "neko"
  ],
  category: 5,
  async execute(message, args) {
    var tag = "random";
    if (args.length >= 1) {
      if (args[0].toLowerCase() === "tags") return await message.channel.send(await this.tagsList(message));
      else if (["auto", "a"].includes(args[0].toLowerCase())) return await this.auto(message, args);
      const testTag = args[0];
      const i = this.tags.findIndex(t => testTag === t);
      if (i !== -1) tag = this.tags[i];
    }
    if (tag === "random") return await message.channel.send(await this.random(message.client));
    await message.channel.send(await this.tagged(message.client, tag));
  },
  async tagged(client, tag) {
    if (tag === "neko") var result = await neko.lewdNeko();
    else if (neko.nsfw[tag]) var result = await neko.nsfw[tag]();
    else return await this.random(client);
    const embed = new Discord.MessageEmbed()
      .setTitle("Tag: " + tag)
      .setColor(color())
      .setImage(result)
      .setTimestamp()
      .setFooter("Made with Akaneko", client.user.displayAvatarURL());
    return embed;
  },
  async random(client) {
    var index = Math.floor(Math.random() * this.tags.length);
    var tag = this.tags[index];
    if (tag === "neko") var result = await neko.lewdNeko();
    else var result = await neko.nsfw[tag]();
    const embed = new Discord.MessageEmbed()
      .setTitle("Tag: " + tag)
      .setColor(color())
      .setImage(result)
      .setTimestamp()
      .setFooter("Made with Akaneko", client.user.displayAvatarURL());
    return embed;
  },
  async tagsList(client) {
    return new Discord.MessageEmbed()
      .setTitle("Tag list")
      .setColor(color())
      .setDescription("**" + this.tags.join("**\n**") + "**")
      .setFooter("Have a nice day! :)", client.user.displayAvatarURL());
  },
  async auto(message, args) {
    if (!args[1]) return message.channel.send("You didn't provide the amount of messages to be sent!");
    else if (!args[2]) return message.channel.send("You didn't provide the interval between each message!");
    var amount = parseInt(args[1]);
    var interval = ms(args[2]);
    if (isNaN(amount)) return message.channel.send("The amount of message is invalid!");
    else if (!interval) return message.channel.send("The interval is not valid!");
    else if (interval < 1000) return message.channel.send("The interval must be larger than 1 second!");
    else if (interval > 300000) return message.channel.send("The interval must be smaller than 5 minutes!");
    else if (amount < 1) return message.channel.send("The amount of message must be larger than 0!");
    else if (amount > 120) return message.channel.send("The amount of message must be smaller than 120!");
    await message.channel.send(`Auto-hentai initialized. **${amount} messages** with interval **${interval} milliseconds**`);
    var tags = this.tags;
    const reverse = !!args[3] && args[3].toLowerCase() == "true";
    if (reverse) tags = args.slice(3).filter(str => !this.tags.includes(str));
    else tags = args.slice(3).filter(str => this.tags.includes(str));
    var counter = 0;
    var i = setInterval(async () => {
      if (counter === amount) {
        await message.channel.send("Auto-hentai ended. Thank you for using that!");
        return clearInterval(i);
      }
      var embed;
      if (tags.length < 1) embed = await this.random(message.client);
      else if (tags.length > 1) embed = await this.tagged(message.client, tags[Math.floor(Math.random() * tags.length)]);
      else embed = await this.tagged(message.client, tags[0]);
      await message.channel.send(embed);
      counter++;
    }, interval);
  }
};
