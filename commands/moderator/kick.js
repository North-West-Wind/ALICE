const { findMember, genPermMsg, commonModerationEmbed } = require("../../function.js");

module.exports = {
  name: "kick",
  description: "Kick a member from the server.",
  args: 1,
  usage: "<user | user ID> [reason]",
  category: 1,
  permissions: 2,
  async execute(message, args) {
    if (!message.guild) return await message.channel.send("This command only works in a server.");
    if (!message.member.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));
    const member = await findMember(message, args[0]);
    if (!member) return;
    var reason;
    if (args[1]) reason = args.slice(1).join(" ");
    const embeds = commonModerationEmbed(message.guild, message.author, member, "kick", "kicked", reason);
    try {
      if (reason) await member.kick(reason);
      else await member.kick();
      member.user.send(embeds[0]).catch(() => { });
      await message.channel.send(embeds[1]);
    } catch (err) {
      await message.channel.send(embeds[2]);
    }
  }
};
