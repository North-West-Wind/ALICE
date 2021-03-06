const { findMember, genPermMsg } = require("../../function.js");
const { NorthClient } = require("../../classes/NorthClient.js");

module.exports = {
  name: "nickname",
  description: "Set user's nickname on the server.",
  usage: "<user | user ID> <nickname>",
  aliases: ["nick"],
  category: 0,
  args: 2,
  permissions: 134217728,
  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if(!message.guild.me.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));
		const member = await findMember(message, args[0]);
    if(!member) return;
    try {
      await member.setNickname(args.slice(1).join(" "));
    } catch(err) {
      NorthClient.storage.error(err);
      return message.channel.send("Failed to set nickname!");
    }
    await message.channel.send(`Set **${member.user.tag}**'s nickname to **${args.slice(1).join(" ")}**`);
  }
}