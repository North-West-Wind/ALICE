var Discord = require("discord.js");
var { shuffleArray, twoDigits, color, findMember, ms } = require("../../function.js");
const { NorthClient } = require("../../classes/NorthClient.js");
var converter = require("number-to-words");
var { createCanvas, loadImage } = require("canvas");
var fs = require("fs");
var moment = require("moment");
require("moment-duration-format")(moment);
var COLOR = ["Yellow", "Blue", "Green", "Red", "Special"];
var NUMBER = ["Reverse", "Skip", "Draw 2", "Draw 4", "Change Color"];
function toString(x) {
  let colorStr = COLOR[x.color];
  let number = x.number;
  if (x.number > 9) number = NUMBER[x.number - 10];
  return `**${colorStr}** - **${number}**`;
}

async function canvasImg(assets, cards) {
  let canvas = createCanvas((cards.length < 5 ? 165 * cards.length : 825), Math.ceil(cards.length / 5) * 256);
  let ctx = canvas.getContext("2d");
  for (let i = 0; i < cards.length; i++) {
    let url = await assets.find(x => x.id === twoDigits(cards[i].color) + twoDigits(cards[i].number)).url;
    let img = await loadImage(url);
    ctx.drawImage(img, (i % 5) * 165, Math.floor(i / 5) * 256, 165, 256);
  }
  return canvas.toBuffer();
}

module.exports = {
  name: "uno",
  description: "Play UNO with your friends!",
  category: 3,
  usage: "[users]",
  async execute(message, args) {
    const c = color();
    var timeLimit = 12 * 60 * 1000;
    if (args.length > 0) {
      var mentions = new Discord.Collection();
      for (const arg of args) {
        const member = await findMember(message, arg);
        if (!member) continue;
        mentions.set(member.id, member);
      }
      if (mentions.size < 1) return await message.channel.send("Your mentions are not valid!");
      var msg = await message.channel.send(`You invited ${mentions.map(user => `<@${user.id}>`).join(" ")} to play UNO.`);
    } else {
      var msg = await message.channel.send("Alright, we will start an UNO game. Who will be invited? Please mention them!");
      var collected = await message.channel.awaitMessages(x => x.author.id === message.author.id, { max: 1, time: 30000 });
      if (!collected || !collected.first()) return msg.edit("Don't make me wait too long. I'm busy.");
      await collected.first().delete();
      if (!collected.first().mentions.members || !collected.first().mentions.members.size) return msg.edit("You didn't invite anyone!");
      else if (collected.first().mentions.members.find(x => x.user.bot)) return msg.edit("Bots cannot play with you!");
      else if (collected.first().mentions.members.find(x => x.id === message.author.id)) return msg.edit("Why would you invite yourself?");
      await msg.edit(`You invited ${collected.first().content} to play UNO.`);
      var mentions = collected.first().mentions.members;
    }
    if (args.find(x => x.startsWith("time="))) {
      const time = ms(args.find(x => x.startsWith("time=")).split("=")[1]);
      if (time) timeLimit = time;
    }
    var responses = 0;
    var accepted = 0;
    var ingame = false;
    var participants = [message.author];
    mentions.forEach(async member => {
      var otherGames = NorthClient.storage.uno.find(game => game.players.has(member.id));
      if (!!otherGames) {
        responses++;
        ingame = true;
        return message.channel.send(`**${member.user.tag}** is already in another game!`);
      }
      participants.push(member.user);
      var em = new Discord.MessageEmbed()
        .setAuthor(message.author.tag, message.author.displayAvatarURL())
        .setColor(c)
        .setTitle(`${message.author.tag} invited you to play UNO!`)
        .setDescription(`Server: **${message.guild.name}**\nChannel: **${message.channel.name}**\nAccept invitation?\n\n✅Accept\n❌Decline`)
        .setTimestamp()
        .setFooter("Please decide in 30 seconds.", message.client.user.displayAvatarURL());
      try {
        var mesg = await member.user.send(em);
      } catch (err) {
        message.channel.send(`Failed to send invitation to **${member.user.tag}**.`);
        responses += mentions.members.length;
        return;
      }
      await mesg.react("✅");
      await mesg.react("❌");
      var rCollected = await mesg.awaitReactions((r, u) => ["✅", "❌"].includes(r.emoji.name) && u.id === member.id, { max: 1, time: 30000 }).catch(() => mesg.reactions.removeAll().catch(() => { }));
      responses += 1;
      mesg.reactions.removeAll().catch(() => { });
      if (!rCollected || !rCollected.first()) {
        em.setDescription("Timed Out").setFooter("The game was cancelled.");
        message.channel.send(`**${member.user.tag}** is not active now.`);
        return await mesg.edit(em);
      }
      em.setFooter("Head to the channel now.", message.client.user.displayAvatarURL());
      var reaction = rCollected.first();
      if (reaction.emoji.name === "✅") {
        message.channel.send(`**${member.user.tag}** accepted the invitation!`);
        em.setDescription(`Server: **${message.guild.name}**\nChannel: **${message.channel.name}**\nYou accepted the invitation!`);
        accepted += 1;
      } else {
        message.channel.send(`**${member.user.tag}** declined the invitation!`);
        em.setDescription(`Server: **${message.guild.name}**\nChannel: **${message.channel.name}**\n"You declined the invitation!`);
      }
      mesg.edit(em);
    });

    let assets;
    var players = new Discord.Collection();

    async function prepare(mesg, nano) {
      const uno = NorthClient.storage.uno;
      const order = shuffleArray(participants);
      message.channel.send(`The order has been decided!${order.map(x => `\n${order.indexOf(x) + 1}. **${x.tag}**`)}`);
      for (const participant of order) players.set(participant.id, { user: participant, card: NorthClient.storage.card.random(7) });
      for (const [_key, player] of players) {
        let em = new Discord.MessageEmbed()
          .setColor(c)
          .setTitle(`The cards have been distributed!`)
          .attachFiles([{ attachment: await canvasImg(assets, player.card), name: "canvas.png" }])
          .setImage("attachment://canvas.png")
          .setDescription(`Your cards:\n\n${player.card.map(x => toString(x)).join("\n")}`)
          .setTimestamp()
          .setFooter("Game started.", message.client.user.displayAvatarURL());
        player.user.send(em);
      }
      var initial = NorthClient.storage.card.filter(x => x.color < 4 && x.number < 10).random();
      uno.set(nano, { players: players, card: initial, cards: 1 });
      let em = new Discord.MessageEmbed()
        .setColor(c)
        .setTitle("The 1st card has been placed!")
        .setThumbnail(message.client.user.displayAvatarURL())
        .setImage(assets.find(x => x.id === twoDigits(initial.color) + twoDigits(initial.number)).url)
        .setDescription(`The card is ${toString(initial)}`)
        .setTimestamp()
        .setFooter(`Placed by ${message.client.user.tag}`, message.client.user.displayAvatarURL());
      mesg.delete();
      return await mesg.channel.send({ content: null, embed: em });
    }

    var overTime = false;
    async function handle(mesg, nano) {
      let uno = NorthClient.storage.uno;
      let drawCard = 0;
      let skip = false;
      var won = false;
      var cancelled = false;
      let nores = 0;
      while (!won) {
        if (nores === players.size) {
          mesg.edit({ embed: null, content: "No one responsded. Therefore, the game ended." });
          uno.delete(nano);
          return;
        }
        nores = 0;
        let i = -1;
        for (var [key, player] of players) {
          if (overTime) {
            won = true;
            let data = await NorthClient.storage.uno.get(nano);
            var scores = 0;
            var lowestP = [], lowestS = -1;
            for (var p of Array.from(data.players.values())) {
              var s = 0;
              for (const card of p.card) {
                if (card.number < 10) s += card.number;
                else if (card.number < 13) s += 20;
                else s += 50;
              }
              if (lowestS < 0 || s <= lowestS) {
                lowestS = s;
                if (s == lowestS) lowestP.push(p.user);
                else lowestP = [p.user];
              }
              scores += s;
            }
            scores -= lowestS * lowestP.length;
            let win = new Discord.MessageEmbed()
              .setColor(c)
              .setTitle(`The time limit has been reached!`)
              .setThumbnail(player.user.displayAvatarURL())
              .setDescription(`Congratulations to **${lowestP.map(u => u.tag).join("**, **")}** winning with **${scores} scores**!\nThe game ended after **${data.cards} cards**, ${moment.duration(Date.now() - nano, "milliseconds").format()}.\nThanks for playing!`)
              .setTimestamp()
              .setFooter("Have a nice day! :)", message.client.user.displayAvatarURL());
            lowestP.forEach(u => u.send("You won the game! Congratulations!"));
            await mesg.delete();
            await mesg.channel.send(win);
            uno.delete(nano);
            break;
          }
          player.card.sort((a, b) => (a.color * 100 + a.number) - (b.color * 100 + b.number));
          i++;
          let top = await uno.get(nano).card;
          if (skip) {
            let skipEm = new Discord.MessageEmbed()
              .setTitle("Your turn was skipped!")
              .setDescription("Someone placed a Skip card!")
              .setColor(c)
              .setTimestamp()
              .setFooter("Better luck next time!", message.client.user.displayAvatarURL());
            player.user.send(skipEm);
            players.set(key, player);
            uno.set(nano, { players: players, card: top, cards: await uno.get(nano).cards });
            skip = false;
            continue;
          }
          let placeable = player.card.filter(x => {
            if (top.number === 12) {
              if (drawCard > 0) return x.number === 12 || x.number === 13;
              return x.color === 4 || x.color === top.color || x.number === 12;
            } else if (top.number === 13) {
              if (drawCard > 0) return x.color === 4 && x.number === 13;
              return x.color === top.color;
            }
            return (x.color === 4) || (x.color === top.color || x.number === top.number);
          });
          var em = new Discord.MessageEmbed()
            .setColor(c)
            .setTitle(`It's your turn now!`)
            .setDescription(`The current card is ${toString(top)}\nYour cards:\n\n${player.card.map(x => toString(x)).join("\n")}\n\n📥 Place\n📤 Draw\n⏹️ Stop\nIf you draw, you will draw **${drawCard > 0 ? drawCard + " cards" : "1 card"}**.`)
            .attachFiles([{ attachment: await canvasImg(assets, player.card), name: "yourCard.png" }])
            .setImage("attachment://yourCard.png")
            .setTimestamp()
            .setFooter("Please decide in 30 seconds.", message.client.user.displayAvatarURL());
          let mssg = await player.user.send(em);
          await mssg.react("📥");
          await mssg.react("📤");
          await mssg.react("⏹️");
          try {
            var collected = await mssg.awaitReactions((r, u) => ["📥", "📤", "⏹️"].includes(r.emoji.name) && u.id === player.user.id, { time: 30 * 1000, max: 1 });
          } catch (err) { }
          var newCard = NorthClient.storage.card.random(drawCard > 0 ? drawCard : 1);
          var card = !newCard.length ? [toString(newCard)] : newCard.map(x => toString(x));
          var draw = new Discord.MessageEmbed()
            .setColor(c)
            .setTitle(`${player.user.tag} drew a card!`)
            .setThumbnail(message.client.user.displayAvatarURL())
            .setDescription(`The top card is ${toString(top)}`)
            .setImage(assets.find(x => x.id === twoDigits(top.color) + twoDigits(top.number)).url)
            .setTimestamp()
            .setFooter(`Placed by ${message.client.user.tag}`, message.client.user.displayAvatarURL());
          if (!collected || !collected.first() || !collected.first().emoji) {
            em = new Discord.MessageEmbed()
              .setColor(c)
              .setTitle(`Your turn ended!`)
              .setDescription(`30 seconds have passed!\nYou have been forced to draw ${card.length} card${card.length > 1 ? "s" : ""}!\n\nYour new card${card.length > 1 ? "s" : ""}:\n${card.join("\n")}`)
              .attachFiles([{ attachment: await canvasImg(assets, newCard), name: "newCard.png" }])
              .setImage("attachment://newCard.png")
              .setTimestamp()
              .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
            await mssg.delete();
            mssg.channel.send(em);
            player.card = player.card.concat(newCard);
            players.set(key, player);
            uno.set(nano, { players: players, card: top, cards: uno.get(nano).cards });
            drawCard = 0;
            draw.setDescription(`${player.user.tag} drew ${card.length} card${card.length > 1 ? "s" : ""}!`)
            mesg.edit(draw);
            nores += 1;
            continue;
          }
          if (collected.first().emoji.name === "📥") {
            if (placeable.length == 0) {
              em = new Discord.MessageEmbed()
                .setColor(c)
                .setTitle(`Your turn ended!`)
                .setDescription(`You don't have any card to place so you are forced to draw ${card.length} card${card.length > 1 ? "s" : ""}!\n\nYour new card${card.length > 1 ? "s" : ""}:\n${card.join("\n")}`)
                .attachFiles([{ attachment: await canvasImg(assets, newCard), name: "newCard.png" }])
                .setImage("attachment://newCard.png")
                .setTimestamp()
                .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
              await mssg.delete();
              mssg.channel.send(em);
              player.card = player.card.concat(newCard);
              players.set(key, player);
              uno.set(nano, { players: players, card: top, cards: await uno.get(nano).cards });
              drawCard = 0;
              draw.setDescription(`${player.user.tag} drew ${card.length} card${card.length > 1 ? "s" : ""}!`)
              mesg.edit(draw);
              continue;
            }
            let keys = [];
            let placeCard = placeable.map(x => {
              keys.push(NorthClient.storage.card.findKey(f => f === x));
              return toString(x) + ` : **${NorthClient.storage.card.findKey(f => f === x)}**`;
            });
            em = new Discord.MessageEmbed()
              .setColor(c)
              .setTitle(`Action: Placing`)
              .setDescription(`Cards you can place:\n\n${placeCard.join("\n")}\nType the ID after the card to place.`)
              .attachFiles([{ attachment: await canvasImg(assets, placeable), name: "place.png" }])
              .setImage("attachment://place.png")
              .setTimestamp()
              .setFooter(`Please decide in 30 seconds.`, message.client.user.displayAvatarURL());
            await mssg.delete();
            mssg = await mssg.channel.send(em);
            try {
              var collected = await mssg.channel.awaitMessages(x => x.author.id === player.user.id, { max: 1, time: 30 * 1000 });
            } catch (err) { }
            if (!collected || !collected.first() || !collected.first().content) {
              em = new Discord.MessageEmbed()
                .setColor(c)
                .setTitle(`Your turn ended!`)
                .setDescription(`30 seconds have passed!\nYou have been forced to draw ${card.length} card${card.length > 1 ? "s" : ""}!\n\nYour new card${card.length > 1 ? "s" : ""}:\n${card.join("\n")}`)
                .attachFiles([{ attachment: await canvasImg(assets, newCard), name: "newCard.png" }])
                .setImage("attachment://newCard.png")
                .setTimestamp()
                .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
              await mssg.delete();
              mssg.channel.send(em);
              player.card = player.card.concat(newCard);
              players.set(key, player);
              uno.set(nano, { players: players, card: top, cards: await uno.get(nano).cards });
              drawCard = 0;
              draw.setDescription(`${player.user.tag} drew ${card.length} card${card.length > 1 ? "s" : ""}!`)
              mesg.edit(draw);
              nores += 1;
              continue;
            }
            if (!keys.includes(collected.first().content)) {
              if (collected.first().content.toLowerCase() == "cancel") {
                cancelled = true;
              }
              if (cancelled) {
                let cancel = new Discord.MessageEmbed()
                  .setColor(c)
                  .setTitle(`${player.user.tag} doesn't want to play with you anymore!`)
                  .setThumbnail(player.user.displayAvatarURL())
                  .setDescription(`**${player.user.tag}** left the game!\nThe game ended after **${data.cards} cards**, ${moment.duration(Date.now() - nano, "milliseconds").format()}.\nThanks for playing!`)
                  .setTimestamp()
                  .setFooter("Have a nice day! :)", message.client.user.displayAvatarURL());
                mesg.edit(cancel);
                uno.delete(nano);
                return;
              }
              em = new Discord.MessageEmbed()
                .setColor(c)
                .setTitle(`Your turn ended!`)
                .setDescription(`You cannot place that card so you drew ${card.length} card${card.length > 1 ? "s" : ""}!\n\nYour new card${card.length > 1 ? "s" : ""}:\n${card.join("\n")}`)
                .attachFiles([{ attachment: await canvasImg(assets, newCard), name: "newCard.png" }])
                .setImage("attachment://newCard.png")
                .setTimestamp()
                .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
              await mssg.delete();
              mssg.channel.send(em);
              player.card = player.card.concat(newCard);
              players.set(key, player);
              uno.set(nano, { players: players, card: top, cards: await uno.get(nano).cards });
              drawCard = 0;
              draw.setDescription(`${player.user.tag} drew ${card.length} card${card.length > 1 ? "s" : ""}!`)
              mesg.edit(draw);
              continue;
            }
            let placedCard = NorthClient.storage.card.get(collected.first().content);
            if (placedCard.number === 13 || placedCard.number === 14) {
              em.setDescription("Please choose your color:").setFooter("Please decide in 30 seconds.");
              await mssg.delete();
              mssg = await mssg.channel.send(em);
              let colors = ["🟥", "🟨", "🟦", "🟩"];
              for (var rColor of colors) {
                mssg.react(rColor);
              }
              try {
                var collected = await mssg.awaitReactions((r, u) => colors.includes(r.emoji.name) && u.id === player.user.id, { max: 1, time: 30 * 1000 });
              } catch (err) { }
              if (!collected?.first()) {
                em = new Discord.MessageEmbed()
                  .setColor(c)
                  .setTitle(`Your turn ended!`)
                  .setDescription(`30 seconds have passed!\nYou have been forced to draw ${card.length} card${card.length > 1 ? "s" : ""}!\n\nYour new card${card.length > 1 ? "s" : ""}:\n${card.join("\n")}`)
                  .attachFiles([{ attachment: await canvasImg(assets, newCard), name: "newCard.png" }])
                  .setImage("attachment://newCard.png")
                  .setTimestamp()
                  .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
                await mssg.delete();
                mssg.channel.send(em);
                player.card = player.card.concat(newCard);
                players.set(key, player);
                uno.set(nano, { players: players, card: top, cards: await uno.get(nano).cards });
                drawCard = 0;
                draw.setDescription(`${player.user.tag} drew ${card.length} card${card.length > 1 ? "s" : ""}!`)
                mesg.edit(draw);
                nores += 1;
                continue;
              }
              let reaction = collected.first();
              let chosenColor;
              let colorStr;
              switch (reaction.emoji.name) {
                case colors[0]:
                  chosenColor = 3;
                  colorStr = "Red";
                  break;
                case colors[1]:
                  chosenColor = 0;
                  colorStr = "Yellow";
                  break;
                case colors[2]:
                  chosenColor = 1;
                  colorStr = "Blue";
                  break;
                case colors[3]:
                  chosenColor = 2;
                  colorStr = "Green";
                  break;
              }
              player.card.splice(player.card.indexOf(placedCard), 1);
              players.set(key, player);
              placedCard = { color: chosenColor, number: placedCard.number };
              em = new Discord.MessageEmbed()
                .setColor(c)
                .setTitle(`Your turn ended!`)
                .setDescription(`The color you chose: ${colorStr}`)
                .setTimestamp()
                .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
            } else {
              player.card.splice(player.card.indexOf(placedCard), 1);
              players.set(key, player);
              em = new Discord.MessageEmbed()
                .setColor(c)
                .setTitle(`Your turn ended!`)
                .setDescription(`You placed ${toString(placedCard)}!`)
                .setTimestamp()
                .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
            }
            await mssg.delete();
            mssg.channel.send(em);
            let data = await uno.get(nano);
            await uno.set(nano, { players: players, card: placedCard, cards: data.cards + 1 });
            let placed = new Discord.MessageEmbed()
              .setColor(c)
              .setTitle(`The ${converter.toOrdinal(data.cards + 1)} card has been placed`)
              .setThumbnail(player.user.displayAvatarURL())
              .setDescription(`The top card is ${toString(placedCard)}`)
              .setImage(assets.find(x => x.id === twoDigits(placedCard.color) + twoDigits(placedCard.number)).url)
              .setTimestamp()
              .setFooter(`Placed by ${player.user.tag}`, message.client.user.displayAvatarURL());
            mesg.edit(placed);
            let reversing = false;
            switch (placedCard.number) {
              case 10:
                reversing = true;
                break;
              case 11:
                skip = true;
                break;
              case 12:
                drawCard += 2;
                break;
              case 13:
                drawCard += 4;
                break;
            }
            if (player.card.length === 0) {
              won = true;
              let data = await NorthClient.storage.uno.get(nano);
              var scores = 0;
              for (var p of Array.from(data.players.values())) {
                for (const card of p.card) {
                  if (card.number < 10) scores += card.number;
                  else if (card.number < 13) scores += 20;
                  else scores += 50;
                }
              }
              let win = new Discord.MessageEmbed()
                .setColor(c)
                .setTitle(`${player.user.tag} won!`)
                .setThumbnail(player.user.displayAvatarURL())
                .setDescription(`Congratulations to **${player.user.tag}** winning with **${scores} scores**!\nThe game ended after **${data.cards} cards**, ${moment.duration(Date.now() - nano, "milliseconds").format()}.\nThanks for playing!`)
                .setTimestamp()
                .setFooter("Have a nice day! :)", message.client.user.displayAvatarURL());
              await player.user.send("You won the game! Congratulations!");
              await mesg.delete();
              await mesg.channel.send(win);
              uno.delete(nano);
              break;
            } else {
              if (reversing) {
                let playerKeys = Array.from(players.keys());
                let playerValues = Array.from(players.values());
                let keySliced = playerKeys.slice(0, i);
                let valueSliced = playerValues.slice(0, i);
                playerKeys = playerKeys.slice(i).concat(keySliced).reverse();
                playerValues = playerValues.slice(i).concat(valueSliced).reverse();
                players.clear();
                for (let s = 0; s < playerKeys.length; s++) {
                  players.set(playerKeys[s], playerValues[s]);
                }
                break;
              }
              continue;
            }
          } else if (collected.first().emoji.name === "📤") {
            em = new Discord.MessageEmbed()
              .setColor(c)
              .setTitle(`Your turn ended!`)
              .setDescription(`You drew ${card.length} card${card.length > 1 ? "s" : ""}!\n\nYour new card${card.length > 1 ? "s" : ""}:\n${card.join("\n")}`)
              .attachFiles([{ attachment: await canvasImg(assets, newCard), name: "newCard.png" }])
              .setImage("attachment://newCard.png")
              .setTimestamp()
              .setFooter(`Game started by ${message.author.tag} | Played in server ${message.guild.name} - channel ${message.channel.name}`, message.client.user.displayAvatarURL());
            await mssg.delete();
            mssg.channel.send(em);
            player.card = player.card.concat(newCard);
            players.set(key, player);
            uno.set(nano, { players: players, card: top, cards: uno.get(nano).cards });
            drawCard = 0;
            draw.setDescription(`${player.user.tag} drew ${card.length} card${card.length > 1 ? "s" : ""}!`)
            mesg.edit(draw);
            continue;
          } else {
            let data = await NorthClient.storage.uno.get(nano);
            cancelled = true;
            let cancel = new Discord.MessageEmbed()
              .setColor(c)
              .setTitle(`${player.user.tag} doesn't want to play with you anymore!`)
              .setThumbnail(player.user.displayAvatarURL())
              .setDescription(`**${player.user.tag}** left the game!\nThe game ended after **${data.cards} cards**, ${moment.duration(Date.now() - nano, "milliseconds").format()}.\nThanks for playing!`)
              .setTimestamp()
              .setFooter("Have a nice day! :)", message.client.user.displayAvatarURL());
            mesg.edit(cancel);
            uno.delete(nano);
            return;
          }
        }
      }
    }
    while (responses < mentions.size) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (responses !== accepted) return message.channel.send("The game cannot start as someone didn't accept the invitation!");
    else if (ingame) return message.channel.send("The game cannot start as somebody is in another game!");
    else {
      var readFile = fs.readFileSync("./.glitch-assets", "utf8");
      var arr = readFile.split("\n");
      for (let i = 0; i < arr.length - 1; i++) arr[i] = JSON.parse(arr[i]);
      assets = arr.filter(x => !x.deleted && x.type === "image/png" && x.imageWidth === 165 && x.imageHeight === 256).map(x => {
        return {
          id: x.name.slice(0, -4),
          url: x.url
        };
      });
      var mesg = await message.channel.send("The game will start soon!");
      var nano = Date.now();
      try {
        mesg = await prepare(mesg, nano);
        setTimeout(() => overTime = true, timeLimit);
        await handle(mesg, nano);
      } catch (err) { return NorthClient.storage.error(err) }
    }
  }
};
