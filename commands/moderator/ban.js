const { NorthClient } = require("../../classes/NorthClient.js");
const { findMember, genPermMsg, commonModerationEmbed } = require("../../function.js");
module.exports = {
  name: "ban",
  description: "Ban a member from the server.",
  args: 1,
  usage: "<user | user ID> [days] [reason]",
  category: 1,
  permissions: 4,
  async execute(message, args) {
    if (!message.member.permissions.has(4)) return message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.permissions.has(4)) return message.channel.send(genPermMsg(this.permissions, 1));
    const member = await findMember(message, args[0])
    if (!member) return;
    let reason = "";
    var options = {};
    if (args[1]) {
      if (isNaN(parseInt(args[1])) || parseInt(args[1]) > 7 || parseInt(args[1]) < 0) return message.channel.send("The number of days of messages to delete provided is not valid. Please provide a number between 0 and 7.")
      if (args[2]) reason = args.slice(2).join(" ");
      options = { reason: reason, days: parseInt(args[1]) };
    }
    const embeds = commonModerationEmbed(message.guild, message.author, member, "ban", "banned", reason);
    try {
      await member.ban(options);
    } catch (err) {
      return await message.channel.send(embeds[2]);
    }
    member.user.send(embeds[0]).catch(() => NorthClient.storage.log("Failed to send DM to " + user.username));
    await message.channel.send(embeds[1]);
  }
};
