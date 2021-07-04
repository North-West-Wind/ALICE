const { NorthClient } = require("../../classes/NorthClient.js");
const { findMember, wait } = require("../../function.js");

module.exports = {
  name: 'unrole',
  description: 'Remove a role from the mentioned user or the user ID in the message.',
  args: 2,
  usage: '<user | userID> <role | role ID | role name>',
  category: 0,
  permissions: 268435456,
  async execute(message, args) {
    if (!message.member.hasPermission(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.hasPermission(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));

    var roleID = args[1].replace(/<@&/g, "").replace(/>/g, "");
    if (isNaN(parseInt(roleID))) {
      var role = await message.guild.roles.cache.find(x => x.name.toLowerCase() === args[1].toLowerCase());
      if (!role) return await message.channel.send("No role was found with the name " + args[1]);
    } else {
      var role = await message.guild.roles.cache.get(roleID);
      if (!role) return await message.channel.send("No role was found!");
    }
    if (!role) return await message.channel.send("The role is not valid!");
    if (args[0] === "@everyone") {
      await message.channel.send("Warning: Large servers might take a while!");
      const allMembers = await message.guild.members.fetch();
      for (const member of allMembers.values()) try {
        await member.roles.remove(role);
        NorthClient.storage.log(`Removed role ${role.name} from member ${member.displayName}`);
        await wait(200);
      } catch (err) {
        await message.channel.send(`Failed to remove role **${role.name}** from **${taggedUser.tag}**. (Error: **${err.message}**)`);
      }
      await message.channel.send(`Finished removing everyone's role **${role.name}**.`);
    } else {
      const member = await findMember(message, args[0]);
      if (!member) return;
      const taggedUser = member.user;
      try {
        await member.roles.remove(role);
        await message.channel.send(`Successfully removed **${taggedUser.tag}** from **${role.name}**.`);
      } catch (err) {
        await message.channel.send(`Failed to remove **${taggedUser.tag}** from **${role.name}**. (Error: **${err.message}**)`);
      }
    }
  },
};