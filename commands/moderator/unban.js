const { genPermMsg, commonModerationEmbed, findMember } = require("../../function.js");

module.exports = {
  name: "unban",
  description: "Unban a member of the server.",
  usage: "<user | user ID> [reason]",
  args: 1,
  category: 1,
  permissions: 4,
  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));
    const member = await findMember(message, args[0])
    if (!member) return;
    var reason;
    if (args[1]) reason = args.slice(1).join(" ");
    const embeds = commonModerationEmbed(message.guild, message.author, member, "unban", "unbanned", reason);
    try {
      if (reason) await message.guild.members.unban(member.user, reason);
      else await message.guild.members.unban(member.user);
      member.user.send(embeds[0]).catch(() => { });
      await message.channel.send(embeds[1]);
    } catch (err) {
      await message.channel.send(embeds[2]);
    }
  }
};
