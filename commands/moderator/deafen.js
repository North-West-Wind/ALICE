const { findMember, genPermMsg, commonModerationEmbed } = require("../../function.js");

module.exports = {
  name: "deafen",
  description: "Deafen a member while the member is in a voice channel.",
  usage: "<user | user ID> [reason]",
  aliases: ["deaf"],
  category: 1,
  args: 1,
  permissions: 8388608,
  async execute(message, args) {
    if (!message.guild) return message.channel.send("This command only works on server.");
    if (!message.member.permissions.has(this.permissions)) return message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.permissions.has(this.permissions)) return message.channel.send(genPermMsg(this.permissions, 1));
    const member = await findMember(message, args[0]);

    if (!member) return;
    await message.delete();
    var reason;
    if (args[1]) reason = args.slice(1).join(" ");
    const embeds = commonModerationEmbed(message.guild, message.author, member, "deafen", "deafened", reason);
    try {
      if (reason) await member.voice.setDeaf(true, reason)
      else await member.voice.setDeaf(true);
      member.user.send(embeds[0]).catch(() => { });
      await message.channel.send(embeds[1]);
    } catch (error) {
      await message.channel.send(embeds[2]);
    }
  }
}