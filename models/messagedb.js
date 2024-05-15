const mongoose = require("mongoose");

const msgSchema = new mongoose.Schema({
    username: {type: String},
    userID: {type: mongoose.Types.ObjectId},
    roomID: {type: String},
    message: {type:String},
    timeStamp: {type: Date, default: Date.now}
});

const sessionSchema = new mongoose.Schema({
    userMap: { type: Object},
    roomID: {type: String},
    topicName:{type:String},
    messages: {type: Array}
});

const joinSchema = new mongoose.Schema({
    usersID: {type: Array},
    roomID: {type: String},
    topicName: {type:String}
});

const revealSchema = new mongoose.Schema({
    userMap: {type: Object}, //maps userid to confirmation status
    roomID: {type: String}
});

const friendRequestSchema = new mongoose.Schema({
    userMap: {type: Object}, 
    sender: {type: String},
    receiver: {type: String},
    roomID: {type: String}
});

const Message = mongoose.model('messages', msgSchema)
const ChatSession = mongoose.model('ChatSession', sessionSchema);
const JoinSession = mongoose.model('JoinSession', joinSchema);
const RevealSession = mongoose.model('RevealSession', revealSchema);
const FriendRequestSession = mongoose.model('FriendRequestSession', friendRequestSchema)

module.exports = { Message, ChatSession, JoinSession,RevealSession, FriendRequestSession};