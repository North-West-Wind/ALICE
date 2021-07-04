const Discord = require("discord.js");
const { findUser, genPermMsg, color } = require("../../function.js");

module.exports = {
  name: "unwarn",
  description: "Remove all warnings of a member of the server.",
  usage: "<user | user ID>",
  category: 1,
  args: 1,
  permissions: 4,
  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));
    const user = await findUser(message, args[0]);
    if (!user) return;
    const con = await message.pool.getConnection();
    const embeds = this.unwarnEmbeds(message.guild, message.author, user);
    var [results] = await con.query(`SELECT * FROM warn WHERE user = '${user.id}' AND guild = '${message.guild.id}'`);
    if (results.length == 0) await message.channel.send("This user haven't been warned before.");
    else try {
      await con.query(`DELETE FROM warn WHERE user = '${user.id}' AND guild = '${message.guild.id}'`);
      user.send(embeds[0]).catch(() => { });
      await message.channel.send(embeds[1]);
    } catch (err) {
      await message.channel.send(embeds[2]);
    }
    con.release();
  },
  unwarnEmbeds(guild, author, user) {
    const warningEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle(`Your warnings have been cleared`)
      .setDescription(`In **${guild.name}**`)
      .setTimestamp()
      .setFooter("Cleared by " + author.tag, author.displayAvatarURL());
    const warnSuccessfulEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle("User Successfully Unwarned!")
      .setDescription(`Unwarned **${user.tag}** in server **${guild.name}**.`);
    const warnFailureEmbed = new Discord.MessageEmbed()
      .setColor(color())
      .setTitle("Failed to removing warning!")
      .setDescription(`Failed to unwarn **${user.tag}** in server **${guild.name}**.`);
    return [warningEmbed, warnSuccessfulEmbed, warnFailureEmbed];
  }
};
