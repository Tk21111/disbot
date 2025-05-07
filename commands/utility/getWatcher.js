const { SlashCommandBuilder } = require('discord.js');
const Watcher = require('../../model/Watcher');
const { checkEmailsWithOAuth2 } = require('../../utils/checkMailO2');
const checkEmails = require('../../utils/emailWatcher'); // For backward compatibility

// Load OAuth2 config
const oauthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkmail')
        .setDescription('Check emails with your watcher settings'),
    
    async execute(interaction) {
        // Acknowledge the interaction immediately
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Find the watcher for this user
            const watcher = await Watcher.findOne({ 
                watcher: { $in: [interaction.user.id] } 
            });
            
            if (!watcher) {
                return interaction.editReply("You don't have a watcher set up. Use /setwatcher or /setupoauth first.");
            }
            
            // Check which authentication method to use
            let emails = [];
            
            if (watcher.oauth2 && watcher.setupComplete && watcher.tokens) {
                // Use OAuth2
                console.log(`Checking emails for ${watcher.email} with OAuth2`);
                
                const result = await checkEmailsWithOAuth2(
                    watcher.email, 
                    watcher.tokens, 
                    oauthConfig, 
                    watcher.word
                );
                
                emails = result.emails;
                
                // Update tokens if they were refreshed
                if (result.tokens && result.tokens !== watcher.tokens) {
                    watcher.tokens = result.tokens;
                    await watcher.save();
                    console.log("Updated OAuth2 tokens");
                }
                
            } else if (!watcher.oauth2 && watcher.pwd) {
                // Use password auth as fallback
                console.log(`Checking emails for ${watcher.email} with password auth`);
                emails = await checkEmails(watcher.email, watcher.pwd, watcher.word);
            } else {
                return interaction.editReply("Your watcher setup is incomplete. Please run /setupoauth and complete the authorization process.");
            }
            
            // Handle results
            if (emails.length === 0) {
                return interaction.editReply("No new emails matching your criteria were found.");
            }
            
            // Format response - limit to first 5 emails
            const emailsToShow = emails.slice(0, 5);
            let response = `Found ${emails.length} new email(s). Here ${emails.length === 1 ? 'is' : 'are'} the detail${emails.length === 1 ? '' : 's'}:\n\n`;
            
            emailsToShow.forEach((email, index) => {
                response += `**Email ${index + 1}**\n`;
                response += `From: ${email.from}\n`;
                response += `Subject: ${email.subject}\n`;
                response += `Date: ${email.date?.toLocaleString() || 'Unknown'}\n`;
                response += `Content: ${(email.content || '').substring(0, 200)}${email.content?.length > 200 ? '...' : ''}\n\n`;
            });
            
            if (emails.length > 5) {
                response += `*${emails.length - 5} more email(s) not shown*`;
            }
            
            return interaction.editReply(response);
            
        } catch (err) {
            console.error("Error checking emails:", err);
            
            // Special handling for OAuth errors
            if (err.message?.includes('invalid_grant') || err.message?.includes('token')) {
                return interaction.editReply("Your Google authorization has expired. Please run /setupoauth again to re-authorize.");
            }
            
            return interaction.editReply(`Failed to check emails: ${err.message}`);
        }
    }
};