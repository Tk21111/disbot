const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Watcher = require('../../model/Watcher');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwatcher')
        .setDescription('Set up an email watcher with filters')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('set name for our watcher')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('email')
                .setDescription('Email address to watch for')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sender')
                .setDescription('sender address')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('content')
                .setDescription('Content text to filter by')
                .setRequired(false))
        .addStringOption(opt => 
            opt.setName('checkDate ex: 2025-06-07')
                .setDescription("set the name")
        )
                ,
    
    async execute(interaction) {
        try {

            await interaction.deferReply({ephemeral : true});
            // Get the options from the command
            const email = interaction.options.getString('email');
            const sender = interaction.options.getString('sender');
            const content = interaction.options.getString('content');
            const name = interaction.options.getString('name');
            const checkDate = interaction.options.getString('checkDate');
            
            // Create configuration object with the provided filters
            const watcherConfig = {
                email,
                sender,
                content,
                name,
                checkDate
            };
            
            
           
            const result = await Watcher.create({
                email,
                sender,
                content,
                name,
                watcher : interaction.user.id,
                guild : interaction.guildId,
                channel : interaction.channelId,
                checkDate

            })

          
            const embed = new EmbedBuilder()
                .setTitle('Email Watcher Configured')
                .setDescription('Your email watcher has been set up with the following filters:')
                .setColor(0x00FF00) // Green color in hex
                .addFields(
                    {
                        name: 'Name',
                        value: watcherConfig.name,
                        inline: true,
                    },
                    {
                        name: 'sender Filter',
                        value: watcherConfig.sender,
                        inline: true,
                    },
                    {
                        name: 'Sender Email',
                        value: watcherConfig.email,
                        inline: true,
                    },
                    {
                        name: 'Check in Date',
                        value: watcherConfig.checkDate,
                        inline: true,
                    }
                )
                .addFields(
                    {
                        name : `follow this link and /config ${result._id} to continous`,
                        value: "https://myaccount.google.com/apppasswords"
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Email Watcher Service' });
            
            

           

            // Reply with the embed
            await interaction.editReply({ embeds: [embed] });
            console.log('Embed sent successfully');
        } catch (error) {
            console.error('Error in setwatcher command:', error);
            
            // Try a simple text response as fallback
            try {
                await interaction.editReply('Email watcher configured successfully.');
            } catch (fallbackError) {
                console.error('Even fallback reply failed:', fallbackError);
            }
        }
    }
};