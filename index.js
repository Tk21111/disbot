const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.MessageContent , GatewayIntentBits.GuildMembers , GatewayIntentBits.Guilds] });

const dotenv = require('dotenv');
dotenv.config()

const mongoose = require('mongoose');
const Watcher = require('./model/Watcher');
const Email = require('./model/Email');
const {searchEmails } = require('./utils/checkMail');
const checkMail = require('./commands/utility/checkMail');
const jwt = require('jsonwebtoken');

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Connect to MongoDB first
mongoose.connect(process.env.MOGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
})
.then(() => {
    console.log('Connected to MongoDB');
    // Only start the Discord bot after successful DB connection
    return client.login(process.env.DISCORD_TOKEN);
})
.then(() => {
    console.log('Bot logged in');
})
.catch(err => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit the process if DB connection fails
});

// Client ready event
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate , async (interaction) => {
	if(!interaction.isStringSelectMenu()) return;

	if(interaction.customId === "select_watcher"){

		await interaction.deferReply({ ephemeral: true });

		const _id = interaction.values[0];
		const result = await Watcher.findById(_id);

		//const mails = await searchEmails({ sender : result.sender , subject : result.content } , { email : result.email , pwd : result.pwd})
	
		jwt.verify(
			result.pwd,
			process.env.TOKEN,
			async (err , decode) => {

				if(err) return console.log("jwt.vertify err : " + err);

				const mails = await searchEmails({ sender : result.sender , subject : result.content , _id : _id , all : true} , { email : result.email , pwd : decode.pwd})

				console.log(mails)
		
				const mailSummary = mails.length > 0
						? mails.map((m, i) => `**${i + 1}.** ${m.subject || 'No Subject'} from ${m.from || 'Unknown Sender'} \n ${m.content || 'No content'} \n ${m.attachment || 'No attachment'} \n ${m.date}`).join('\n')
						: 'No matching emails found.';

					const embed = new EmbedBuilder()
						.setTitle(`📬 Results for ${result.email}`)
						.setColor(0x00ADEF)
						.setDescription(mailSummary.slice(0,4095)) //lol 
						.setFooter({ text: 'Filtered using your watcher settings' })
						.setTimestamp();

					await interaction.editReply({ embeds: [embed] });
				}
			)

	}

	if(interaction.customId == "delete_watcher"){

		try {
			await interaction.deferReply({ ephemeral: true });
			const _id = interaction.values[0];
			const result = await Watcher.findByIdAndDelete(_id);

			const embed = new EmbedBuilder()
				.setTitle(`Deleted ${result.name}`)
				.setColor('Red')
				.setTimestamp();

			await interaction.editReply({embeds : [embed]})
			
		} catch (err){
			console.log("delete watcher : " + err)
		}
		


	}
})

client.on(Events.InteractionCreate, async interaction => {

    //check if using cmd
	if (!interaction.isChatInputCommand()) return;

    //return cmd use
    //not same as client 
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {

        //execute cmd
		await command.execute(interaction);
        
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});


setInterval(async () => {
	try {

		const watcher = await Watcher.distinct('guild');

		for (let f of watcher){

			let mailSummary = {};

			const watcherEachGuild = await Watcher.find({guild : f})

			console.log(watcherEachGuild)

			//each guild
			for (let i of watcherEachGuild){


				await new Promise((resolve , reject) => {
					
					jwt.verify(
					i.pwd,
					process.env.TOKEN,
					async (err , decode) => {
		
						if(err) {reject(err); console.log("jwt.vertify err : " + err); }
						const mails = await searchEmails({ sender : i.sender , subject : i.content , _id : i._id , all : false} , { email : i.email , pwd : decode.pwd})
						
						mailSummary[i.channel] = mailSummary[i.channel] ? mailSummary[i.channel] += mails.map((m, i) => `**${i + 1}.** ${m.subject || 'No Subject'} from ${m.from || 'Unknown Sender'} \n ${m.content || 'No content'} \n ${m.attachment || 'No attachment'} \n ${m.date || ""}`).join('\n') : mails.map((m, i) => `**${i + 1}.** ${m.subject || 'No Subject'} from ${m.from || 'Unknown Sender'} \n ${m.content || 'No content'} \n ${m.attachment || 'No attachment'} \n ${m.date || ""}`).join('\n')
						resolve(null)
					}
				)}
			
			)
		
			
			
			if(Object.keys(mailSummary) == 0) continue

			//combine channel
			for (let k of Object.keys(mailSummary)){

				if(!mailSummary[k] || mailSummary[k].trim() === '') continue
				
				const embed = new EmbedBuilder()
				.setTitle(`📬 Results for tracker`)
				.setColor(0x00ADEF)
				.setDescription(mailSummary[k].slice(0,4085) || "no data")
				.setFooter({ text: 'Filtered using your watcher settings' })
				.setTimestamp();
		
				// Send to a specific channel by its ID (replace 'yourChannelID' with the actual channel ID)
				const channel = await client.channels.fetch(k);
				await channel.send({ embeds: [embed] });
			}

				
			//const mails = await searchEmails({ sender : i.sender , subject : i.content , _id : i._id , all : false} , { email : i.email , pwd : i.pwd})

			
			}
		}
		} catch (error) {
		console.error('Error fetching emails:', error);
		// Optionally, send an error message to the same channel
		const channel = await client.channels.fetch('1369373549533466698');
		await channel.send('There was an error fetching the emails.');
		}
  }, 1000 * 60 *15);
  


client.login(process.env.DISCORD_TOKEN);