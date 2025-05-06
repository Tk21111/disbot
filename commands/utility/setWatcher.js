const { SlashCommandBuilder } = require('discord.js')


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
        const email = interaction.options.getString("email")
        const pwd = interaction.options.getString("pwd")
        const word = interaction.options.getString("word")

        await interaction.reply(email + pwd + word)
    }
}