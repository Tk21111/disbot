const { Schema , model} = require('mongoose')

const Watcher = new Schema({

    //discord config
    watcher : {
        type : String,
        required : true
    },
    guild :{
        type : String,
        required : true
    },
    channel : {
        type : String,
        required : true
    },
    //email checker
    email : {
        type : String,
        required : true
    },
    pwd : {
        type : String,
    },
    content : {
        type : String,

    },
    sender : {
        type : String,
    },

    //user customize
    name : {
        type : String,
        required : true
    }
})

module.exports = model('Watcher' , Watcher)