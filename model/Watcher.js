const { Schema , model} = require('mongoose')

const Watcher = new Schema({
    watcher : [String],
    email : {
        type : String,
        required : true

    },
    pwd : {
        type : String,
        required : true
    },
    word : {
        type : String,
        required : true
    },
     // OAuth2 related fields
     oauth2: {
        type: Boolean,
        default: false
    },
    tokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number
    },
    // Store if the user has completed OAuth2 setup
    setupComplete: {
        type: Boolean,
        default: false
    }
})

module.exports = model('Watcher' , Watcher)