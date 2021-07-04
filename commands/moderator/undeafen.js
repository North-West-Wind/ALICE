const { findMember, commonModerationEmbed, genPermMsg } = require("../../function.js");

module.exports = {
  name: "undeafen",
  description: "Undeafen a member while the member is in a voice channel.",
  args: 1,
  aliases: ["undeaf"],
  usage: "<user | user ID> [reason]",
  category: 1,
  permissions: 8388608,
  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));
    const member = await findMember(message, args[0]);
    if (!member) return;
    var reason;
    if (args[1]) reason = args.slice(1).join(" ");
    const embeds = commonModerationEmbed(message.guild, message.author, member, "undeafen", "undeafened", reason);
    try {
      if (reason) await member.voice.setDeaf(false, reason)
      else await member.voice.setDeaf(false);
      member.user.send(embeds[0]).catch(() => { });
      await message.channel.send(embeds[1]);
    } catch (error) {
      await message.channel.send(embeds[2]);
    }
  }
}