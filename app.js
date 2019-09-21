const Discord = require("discord.js");
const client = new Discord.Client();

const https = require("https");
const Parser = require("binary-parser").Parser;

const config = require("./config.json");

// must match https://github.com/BZFlag-Dev/bzflag/blob/2.4/src/net/Ping.cxx#L257-L277
const parser = new Parser()
  .uint16("gameStyle")
  .uint16("gameOptions")
  .uint16("maxShots")
  .uint16("shakeWins")
  .uint16("shakeTimeout")
  .uint16("maxPlayerScore")
  .uint16("maxTeamScore")
  .uint16("maxTime")
  .uint8("maxPlayers")
  .uint8("rogueSize")
  .uint8("rogueMax")
  .uint8("redSize")
  .uint8("redMax")
  .uint8("greenSize")
  .uint8("greenMax")
  .uint8("blueSize")
  .uint8("blueMax")
  .uint8("purpleSize")
  .uint8("purpleMax")
  .uint8("observerSize")
  .uint8("observerMax");

const autoPlural = (word, number) => `${word}${number !== 1 ? "s" : ""}`;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Invite: https://discordapp.com/api/oauth2/authorize?client_id=${config.client_id}&scope=bot`);

  client.user.setStatus("online");
  client.user.setActivity("bzservers", {type: "LISTENING"});
});

client.on("message", (msg) => {
  // ignore message if it was sent by a bot
  if(msg.author.bot){
    return;
  }

  // send keyword if message is a ping
  if(msg.content.trim() === `<@${client.user.id}>`){
    msg.reply("Send just `bzservers` in chat to get servers with players.");
    return;
  }
  
  if(msg.content === "bzservers"){
    https.get("https://my.bzflag.org/db/?action=LIST&listformat=json&version=BZFS0221", (resp) => {
      let data = "";

      // a chunk of data has been recieved.
      resp.on("data", (chunk) => data += chunk);

      // the whole response has been received
      resp.on("end", () => {
        const servers = JSON.parse(data.replace(/\\/g, "")).servers;
        const activeServers = [];

        for(const server of servers){
          const hex = parser.parse(Buffer.from(server[1], "hex"));
          const players = hex.redSize + hex.greenSize + hex.blueSize + hex.purpleSize;

          // add server if it has at least 1 player online
          if(players > 0){
            activeServers.push({
              players,
              observers: hex.observerSize,
              title: server[4].replace("*", "\\*")
            });
          }
        }

        // sort active servers by most players descending
        activeServers.sort((a, b) => b.players - a.players);

        // create the rich embed to send
        const embed = new Discord.RichEmbed()
                          .setDescription("BZFlag servers with online players")
                          .setColor("BLUE")
                          .setThumbnail(client.user.displayAvatarURL);
        // add each active server to the rich embed
        for(const server of activeServers){
          embed.addField(server.title, `${server.players} ${autoPlural("player", server.players)} and ${server.observers} ${autoPlural("observer", server.observers)} online`);
        }

        msg.channel.send(embed);
      });
    }).on("error", (err) => {
      console.log(`Error: ${err.message}`);
      msg.channel.send("There was an error getting info about online servers.");
    });
  }
});

client.login(config.token);