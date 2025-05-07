const { Schema , model} = require('mongoose')

const Email = new Schema({
   date : String,
   subject : String,
   from : String,
   to : String,
   content : String,
   attachment : Buffer,
   watcher : {
    type : Schema.Types.ObjectId , ref : 'Watcher'
   }
})

module.exports = model('Email' , Email)