const { SlashCommandBuilder } = require('discord.js');
const Watcher = require('../../model/Watcher');
const { getTokensFromCode } = require('../../utils/checkMailO2');

// Load OAuth2 config from environment variables
const oauthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('authcode')
        .setDescription('Complete OAuth2 setup with the authorization code')
        .addStringOption(opt => 
            opt.setName("code")
                .setDescription("The authorization code from Google")
                .setRequired(true)
        ),
    
    async execute(interaction) {
        // Always use ephemeral replies for security
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const code = interaction.options.getString("code");
            const userId = interaction.user.id;
            
            // Find the watcher for this user
            const watcher = await Watcher.findOne({ watcher: { $in: [userId] }, oauth2: true });
            
            if (!watcher) {
                return interaction.editReply("Please run /setupoauth first to start the OAuth setup process.");
            }
            
            // Exchange the code for tokens
            const tokens = await getTokensFromCode(code, oauthConfig);
            
            if (!tokens || !tokens.access_token) {
                return interaction.editReply("Failed to get valid tokens. Please try the setup process again.");
            }
            
            // Store the tokens
            watcher.tokens = tokens;
            watcher.setupComplete = true;
            await watcher.save();
            
            await interaction.editReply({
                content: "✅ Your Gmail account has been successfully connected! You can now use `/checkmail` to check for new emails.",
            });
            
        } catch (err) {
            console.error("Error processing auth code:", err);
            await interaction.editReply("Failed to process authorization code: " + err.message);
        }
    }
};