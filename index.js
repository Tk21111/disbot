const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.MessageContent , GatewayIntentBits.GuildMembers , GatewayIntentBits.Guilds] });

const dotenv = require('dotenv');
dotenv.config()

const mongoose = require('mongoose');


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



client.login(process.env.DISCORD_TOKEN);