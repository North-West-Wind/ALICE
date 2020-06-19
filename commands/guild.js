const { findRole, findUser } = require("../function.js");
const Discord = require("discord.js");
var color = Math.floor(Math.random() * 16777214) + 1;

module.exports = {
  name: "guild",
  description: "Made specificly for the Hypixel guild War of Underworld.",
  usage: "<subcommand>",
	aliases: ["gu"],
  subcommands: ["splash", "invite"],
  subaliases: ["sp", "in"],
  async execute(message, args, pool) {
		if(!args[0]) return message.channel.send("Please use a subcommand: " + `**${this.subcommands.join("**, **")}**\n` + `Usage: ${require("../config.json").prefix}${this.name} ${this.usage}`);

		switch(args[0]) {
			case "sp":
			case "splash":
			return await this.splash(message);
			case "in":
			case "invite":
			return await this.invite(message, args, pool);
		}
  },
	async invite(message, args, pool) {
		if(message.guild.id != "622311594654695434") return message.channel.send("Please use this command in the server War of Underworld. Thank you.");
		let divine = message.guild.roles.fetch("640148120579211265");
		if(message.member.roles.highest.position < divine.position) return message.channel.send("You don't have the role to use this command!")
		if(!args[1]) return message.channel.send("You didn't mention any user!");
		let user = await findUser(message, args[1]);
		if(!user) return;
		pool.getConnection((err, con) => {
			if(err) return message.reply("there was an error connecting to the database!");
			con.query(`SELECT * FROM dcmc WHERE dcid = "${user.id}"`, async (err, result) => {
				if(err) return message.reply("there was an error fetchinbg the player!");
				let channel = await message.client.channels.fetch("723479832452661269");
				if(result.length < 1) {
					message.channel.send(`Player not found with the user <@${user.id}>. Rejected automatically.`);
					channel.send(`❌ | <@${user.id}> Sorry, you cannot join the guild because we don't know your Minecraft username. Please leave your name in <#647630951169523762>`);
					return;
				}
				let em = new Discord.MessageEmbed()
				.setColor(color)
				.setTitle("Please choose an operation:")
				.setDescription("1️⃣: Accept\n2️⃣: Decline (Already in another guild)\n3️⃣: Decline (Already in guild)\n4️⃣: Decline (Banned)")
				.setTimestamp()
				.setFooter("Please choose within 2 minutes.", message.client.user.displayAvatarURL());

				let msg = await message.channel.send(em);
				await msg.react("1️⃣");
				await msg.react("2️⃣");
				await msg.react("3️⃣");
				await msg.react("4️⃣");

				let collected = undefined;
				collected = await msg.awaitReactions((r, u) => ["1️⃣", "2️⃣", "3️⃣", "4️⃣"].includes(r.emoji.name) && u.id == message.author.id, { max: 1, time: 120000, errors: ["time"]}).catch(console.error);
				await msg.reactions.removeAll().catch(console.error);
				if(!collected || !collected.first()) {
					return message.channel.send("No operation chosen in 2 minutes. Please try again.");
				}
				const reaction = collected.first();
				switch(reaction.emoji.name) {
					case "1️⃣":
						await msg.edit({ content: "Request Accpected", embed: null});
						channel.send(`✅ | <@${user.id}> Congratulations ! You have been invited to the guild. Please accept the invite in Hypixel in 5 minutes ! If you can't join our guild right now, you will need to find guild officers to invite you again later.`);
					break;
					case "2️⃣":
						await msg.edit({ content: "Request Declined (Already in another guild)", embed: null});
						channel.send(`❌ | <@${user.id}> Sorry, you are not allow to join our guild because you are already in another guild. Please read the pinned message in <#713745394026414080>!`);
					break;
					case "3️⃣":
						await msg.edit({ content: "Request Declined (Already in guild)", embed: null});
						channel.send(`❌ | <@${user.id}> Sorry, you are already in our guild. If you keep spamming requests, you will get banned!`);
					break;
					case "4️⃣":
						await msg.edit({ content: "Request Declined (Already in guild)", embed: null});
						channel.send(`❌ | <@${user.id}> Sorry, you are banned from our guild. Good luck finding another one!`);
					break;
				}
			});
			con.release();
		})
	},
  async splash(message) {
    let msg = await message.channel.send("Which channel do you want the message to be announced?");
                  let collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors: ["time"]}).catch(err => collected = undefined);
                  if(collected.first())
                    collected.first().delete();
                  if(!collected || !collected.first() || !collected.first().content) {
                    return msg.edit("Timed out. Please try again.");
                  }
                  if(collected.first().content === "cancel") {
                    return await msg.edit("Cancelled action.");
                  }
                  var channelID = collected
                    .first()
                    .content.replace(/<#/g, "")
                    .replace(/>/g, "");
                  let channel = await message.guild.channels.resolve(channelID);
                  if (!channel || channel === undefined || channel === null) {
                    return msg.edit(channelID + " isn't a valid channel!");
                  }
                  await msg.edit(`The announcement will be made in <#${channelID}>. What is the location of the splash?`);
                  collected = undefined;
                  collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors: ["time"]}).catch(err => collected = undefined);
                  if(collected.first())
                    collected.first().delete();
                  if(!collected || !collected.first() || !collected.first().content) {
                    return msg.edit("Timed out. Please try again.");
                  }
                  if(collected.first().content === "cancel") {
                    return await msg.edit("Cancelled action.");
                  }
                  let location = collected.first().content;
                  
                  await msg.edit(`Ok. The location will be **${location}**. Now, please enter the amount of potions and slots. [Format: <potions> <slots>]`);
                  
                  collected = undefined;
                  collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors: ["time"]}).catch(err => collected = undefined);
                  if(collected.first())
                    collected.first().delete();
                  if(!collected || !collected.first() || !collected.first().content) {
                    return msg.edit("Timed out. Please try again.");
                  }
                  if(collected.first().content === "cancel") {
                    return await msg.edit("Cancelled action.");
                  }
                  if(!collected.first().content.split(" ")[1]) {
                    return await msg.edit("You didn't enter the amount of slots!");
                  }
                  let potions = parseInt(collected.first().content.split(" ")[0]);
                  let slots = parseInt(collected.first().content.split(" ")[1]);

									await msg.edit(`Alright, there will be **${potions} potions** and **${slots} slots**. Which role should I mention?`);
									collected = undefined;
									collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors:["time"] }).catch(err => collected = undefined);
                  if(collected.first())
                    collected.first().delete();
                  if(!collected || !collected.first() || !collected.first().content) {
                    return msg.edit("Timed out. Please try again.");
                  }
                  if(collected.first().content === "cancel") {
                    return await msg.edit("Cancelled action.");
                  }
									var role = await findRole(message, collected.first().content);
									if(!role) {
										msg.delete();
										return;
									}

                  await msg.edit("Add notes? [Yes/No]");
                  collected = undefined;
                  collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors: ["time"]}).catch(err => collected = undefined);
                  if(collected.first())
                    collected.first().delete();
                  if(!collected || !collected.first() || !collected.first().content) {
                    await msg.edit("Timed out. I will take it as a NO.");
                  }
                  if(collected.first().content === "cancel") {
                    return await msg.edit("Cancelled action.");
                  }
                  let notes = "";
                  if(["yes", "y"].includes(collected.first().content.toLowerCase())) {
                    await msg.edit("Please enter your notes.");
										collected = undefined;
                	  collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors: ["time"]}).catch(err => collected = undefined);
                  	if(collected.first())
                  	  collected.first().delete();
	                  if(!collected || !collected.first() || !collected.first().content) {
  	                  await msg.edit("Timed out. No notes will be added then.");
    	              }
      	            if(collected.first().content === "cancel") {
        	            return await msg.edit("Cancelled action.");
          	        }
										notes = collected.first().content;
                  }

									let mc = "";
									await msg.edit("Please tell me your Minecraft username.");
									collected = undefined;
                  collected = await msg.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000, errors: ["time"]}).catch(err => collected = undefined);
                  if(collected.first())
                    collected.first().delete();
	                if(!collected || !collected.first() || !collected.first().content) {
  	                await msg.edit("Timed out. Please try again.");
										return;
    	            }
      	          if(collected.first().content === "cancel") {
        	          return await msg.edit("Cancelled action.");
        	        }
									mc = collected.first().content;

		let em = new Discord.MessageEmbed()
		.setTitle("There is a splash!")
		.setColor(color)
		.setDescription(`\`${mc}\` is hosting a splash!\nDo \`/p join ${mc}\` in Hypixel to be part of it!\n\n**Location:** ${location}\n**Potions:** ${potions}\n**Slots:** ${slots}\n**Note: ** ${notes.length > 0 ? notes : "N/A"}`)
		.setTimestamp()
		.setFooter(`Hosted by ${mc}`, message.client.user.displayAvatarURL());

		channel.send({ content: `<@&${role.id}>`, embed: em});

		await msg.edit("The message has been sent!");
  }
}