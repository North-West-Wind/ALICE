const Discord = require("discord.js");
var color = Math.floor(Math.random() * 16777214) + 1;

module.exports = {
  name: "shop",
  description: "Spend your money here!",
  execute(message, args, pool) {
    pool.getConnection(function(err, con) {
      if (err) return message.reply("there was an error trying to execute that command!");
      con.query(
        "SELECT * FROM currency WHERE user_id = " +
          message.author.id +
          " AND guild = " +
          message.guild.id,
        async function(err, results, fields) {
          if (err) return message.reply("there was an error trying to execute that command!");
          if (results.length == 0) {
            var cash = 0;
          } else {
            var cash = results[0].currency;
          }
          const shop = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("Welcome to the shop!")
            .setDescription("Choose an action:\n\n1️⃣ Shop\n2️⃣ Leave")
            .setFooter("You have $" + cash, message.author.displayAvatarURL());

          const leave = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("You were told to leave.")
            .setDescription("The staff waited too long and tells you to leave.")
            .setFooter("You have $" + cash, message.author.displayAvatarURL());

          var msg = await message.channel.send(shop);
          await msg.react("1️⃣");
          await msg.react("2️⃣");

          const filter = (reaction, user) => {
            return (
              ["1️⃣", "2️⃣"].includes(reaction.emoji.name) &&
              user.id === message.author.id
            );
          };
          var collected = await msg
            .awaitReactions(filter, { max: 1, idle: 60000, error: ["time"] })
            .catch(err => msg.edit(leave));
          var reaction = collected.first();
          
          

          const menu = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("Shop Menu")
            .setDescription("Nothing is being sold now.")
            .setFooter("You have $" + cash, message.author.displayAvatarURL());

          const manualLeave = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("Goodbye!")
            .setDescription("said the staff.")
            .setFooter("You have $" + cash, message.author.displayAvatarURL());

          if (reaction.emoji.name === "1️⃣") {
            
            msg.edit(menu);
          } else if(reaction.emoji.name === "2️⃣") {
            msg.edit(manualLeave);
          }
        }
      );
      con.release();
    });
  }
};
