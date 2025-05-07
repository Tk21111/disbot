const { SlashCommandBuilder } = require('discord.js')
const Watcher = require('../../model/Watcher')
const { getAuthUrl } = require('../../utils/checkMailO2');

// Load OAuth2 config from environment variables or a config file
const oauthConfig = {
    clientId: process.env.GG_CLIENT_ID,
    clientSecret: process.env.GG_CLIENT_SECRET,
    redirectUri: process.env.GG_REDIRECT_URI // Should point to your callback endpoint
};

module.exports = {
    data : new SlashCommandBuilder()
        .setName('setwatcher')
        .setDescription('set email and word')
        .addStringOption(opt => 
            opt.setName("email")
                .setDescription("email : ")
        )
        .addStringOption(opt => 
            opt.setName("pwd")
                .setDescription("pwd : ")
        )
        .addStringOption(opt => 
            opt.setName("word")
                .setDescription("word : ")
        ),
        //addUserOption
        // .addStringOption(option =>
		// 	option.setName('category')
		// 		.setDescription('The gif category')
		// 		.setRequired(true)
		// 		.addChoices(
		// 			{ name: 'Funny', value: 'gif_funny' },
		// 			{ name: 'Meme', value: 'gif_meme' },
		// 			{ name: 'Movie', value: 'gif_movie' },
		// 		)),
    async execute(interaction){

        // Acknowledge the interaction immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        try {
        const email = interaction.options.getString("email")
        const word = interaction.options.getString("word")
        const userId = interaction.user.id;

        //await interaction.reply(email + pwd + word)
        // Check if config is available
        if (!oauthConfig.clientId || !oauthConfig.clientSecret || !oauthConfig.redirectUri) {
            return interaction.editReply(
                "OAuth2 is not properly configured. Please contact the bot administrator."
            );
        }

         
            // Generate a unique state parameter to prevent CSRF
            // We'll use the user's Discord ID
            const state = userId;
            
            // Generate the OAuth URL
            const authUrl = getAuthUrl(oauthConfig);
            
            // Create or update the watcher with initial data
            const existingWatcher = await Watcher.findOne({ watcher: { $in: [userId] } });
            
            if (existingWatcher) {
                // Update existing watcher
                existingWatcher.email = email;
                existingWatcher.word = word || existingWatcher.word;
                existingWatcher.oauth2 = true;
                existingWatcher.setupComplete = false;
                await existingWatcher.save();
            } else {
                // Create new watcher
                await Watcher.create({
                    email,
                    word,
                    watcher: [userId],
                    oauth2: true,
                    setupComplete: false
                });
            }
            
            // Send the auth URL to the user
            await interaction.editReply({
                content: `Please click the link below to authorize access to your Gmail account. This link will expire in 10 minutes.\n\n${authUrl}\n\nAfter authorization, you will be redirected to a page with a code. Use the \`/authcode\` command with that code to complete setup.`,
            });

        } catch (err){
            await interaction.editReply("fail to create watcher : " + err)
        }

       


    }
}