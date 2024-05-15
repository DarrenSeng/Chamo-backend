const mongoose = require("mongoose")

const msgSchema = new mongoose.Schema({
    username: {type: String},
    userID: {type: mongoose.Types.ObjectId},
    HelpRequest: {type: String},
    timeStamp: {type: Date, default: Date.now}
});

const HelpRequest = mongoose.model('help_request', msgSchema)

module.exports = HelpRequest
