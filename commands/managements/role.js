const { NorthClient } = require("../../classes/NorthClient.js");
const { findMember, wait, genPermMsg } = require("../../function.js");

module.exports = {
  name: 'role',
  description: 'Give a role to the mentioned user or the user ID in the message.',
  args: true,
  usage: '<user | user ID> <role | role ID | role name>',
  category: 0,
  args: 2,
  permissions: 268435456,
  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 0));
    if (!message.guild.me.has(this.permissions)) return await message.channel.send(genPermMsg(this.permissions, 1));
    var roleID = args[1].replace(/<@&/g, "").replace(/>/g, "");
    if (isNaN(parseInt(roleID))) {
      var role = await message.guild.roles.cache.find(x => x.name.toLowerCase() === args[1].toLowerCase());
      if (!role) return message.channel.send("No role was found with the name " + args[1]);
    } else {
      var role = await message.guild.roles.cache.get(roleID);
      if (!role) return message.channel.send("No role was found!");
    }

    if (!role) return message.channel.send("No role was found!");
    if (args[0] === "@everyone") {
      await message.channel.send("Warning: Large servers might take a while!");
      const allMembers = await message.guild.members.fetch();
      for (const member of allMembers.values()) try {
        await member.roles.add(role);
        NorthClient.storage.log(`Added member ${member.displayName} to ${role.name}`);
        await wait(200);
      } catch (err) {
        await message.channel.send(`Failed to add **${member.user.tag}** to role **${role.name}**. (Error: **${err.message}**)`);
      }
      await message.channel.send(`Finished adding everyone to the role **${role.name}**.`);
    } else {
      const member = await findMember(message, args[0]);
      if (!member) return;
      const taggedUser = member.user;
      try {
        await member.roles.add(role);
        await message.channel.send(`Successfully added **${taggedUser.tag}** to role **${role.name}**.`);
      } catch (err) {
        await message.channel.send(`Failed to add **${taggedUser.tag}** to role **${role.name}**. (Error: **${err.message}**)`);
      }
    }
  },
};