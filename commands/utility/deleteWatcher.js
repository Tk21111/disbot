const {SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder} = require('discord.js');
const Watcher = require('../../model/Watcher');


module.exports = {
    data : new SlashCommandBuilder()
        .setName("delwatcher")
        .setDescription("Select one of your watchers to view its config")

    , async execute(interaction){

        await interaction.deferReply({ ephemeral: true });

        const data = await Watcher.find().select(" -pwd")

        if(!data){
            await interaction.editReply("No watcher");
        }

        const option = data.map(val => 
            (new StringSelectMenuOptionBuilder ()
                .setLabel(val.name || ` _id : ${val._id}`)
                .setDescription("select to delete watcher")
                .setValue((val._id).toString())
        ));

        const select = new StringSelectMenuBuilder()
            .setCustomId("delete_watcher")
            .setPlaceholder("option..")
            .addOptions(option)

        const row  = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
            content : 'select watcher to view details',
            components : [row]
        })

    }
}