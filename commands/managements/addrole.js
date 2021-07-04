const { ApplicationCommand, ApplicationCommandOption, InteractionResponse, InteractionApplicationCommandCallbackData } = require("../../classes/Slash");
const { genPermMsg, commonRoleEmbed } = require("../../function");

module.exports = {
  name: "addrole",
  description: "Add a new role to the server. The “color” parameter is optional.",
  args: 1,
  usage: "<role name> [color]",
  category: 0,
  permission: 268435456,
  async execute(message, args) {
    if (!message.guild) return await message.channel.send("This command only works on server.");
    if (!message.member.permissions.has(this.permission)) return await message.channel.send(genPermMsg(this.permission, 0));
    if (!message.guild.me.permissions.has(this.permission)) return await message.channel.send(genPermMsg(this.permission, 1));
    if (!args[0]) return await message.channel.send("You didn't tell me the role name!" + ` Usage: \`${message.prefix}${this.name} ${this.usage}\``);
    const embeds = commonRoleEmbed(message.client, "create", "created", args[0]);
    try {
      if (!args[1]) await message.guild.roles.create({ data: { name: args[0] } });
      else await message.guild.roles.create({ data: { name: args[0], color: args[1] } });
      return await message.channel.send(embeds[0]);
    } catch (err) {
      return await message.channel.send(embeds[1]);
    }
  }
};
