const { SlashCommandBuilder } = require('discord.js');
const Watcher = require('../../model/Watcher');
const jwt = require('jsonwebtoken');


module.exports = {
    data : new SlashCommandBuilder()
        .setName('configwatcher')
        .setDescription('set email and word')
        .addStringOption(opt => 
            opt.setName("_id")
                .setDescription("_id : ")
                .setRequired(true)
        )
        .addStringOption(opt => 
            opt.setName("pwd")
                .setDescription("pwd : ")
                .setRequired(true)
        )
      
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
    ,
    async execute(interaction){

        await interaction.deferReply({ephemeral : true});

        try {

            const _id = interaction.options.getString("_id");
            const pwd = interaction.options.getString("pwd");

           const refreshToken = jwt.sign(
                {
                    "pwd" : pwd
                },
                process.env.TOKEN,
           )
    
            await Watcher.findByIdAndUpdate(_id , {
                pwd : refreshToken
            })

            await interaction.editReply("finish set up")

        } catch(err){
            console.log("/config " + err);
            await interaction.editReply(err);
        }
       
     

    }
}