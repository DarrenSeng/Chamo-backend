const express = require('express');
const router = express.Router();
const { User, validate } = require('../models/userdb');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const {ChatSession, RevealSession, FriendRequestSession} = require('../models/messagedb')

function generateRandomUsername() {
    const adjectives = ["Funny", "Silly", "Goofy", "Smiling", "Excited",
    "Amazing", "Great", "Happy", "Adventurous", "Lighthearted", "Wild", "Quiet", "Loud", "Soft",
    "Loud", "Calm", "Empathetic", "Serene", "Joyful", "Jolly", "Merry", "Cheerful", "Gleeful",
    "Carefree", "Blissful", "Optimistic", "Shining", "Sunny", "Radiant", "Bright", "Luminous",
    "Nice"]
    const animals = ["Monkey", "Dog", "Cat", "Bird", "Fish", "Tiger", "Lion", "Bear", "Elephant",
    "Horse", "Squirrel", "Rabbit", "Kangaroo", "Koala", "Panda", "Giraffe", "Zebra", "Rhino",
    "Starfish", "Crab", "Flower", "Rose", "Daisy", "Sunflower", "Tulip", "Lily", "Daffodil",
    "Orchid", "Iris", "Poppy", "Carnation", "Peony", "Dahlia", "Hyacinth", "Lavender", "Lilac",
    "Star", "Moon", "Sun", "Planet", "Galaxy", "Universe", "Asteroid", "Meteor", "Comet", "Nebula",]
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const randomNum = Math.floor(Math.random() * (100 - 0 + 1) + 0)
    return `${randomAdjective} ${randomAnimal} #${randomNum}`;
}

// Object to store flags indicating ongoing session creation processes for each room ID
//lock code might not be needed
const sessionCreationLocks = {};

function getOrCreateLock(roomID) {
    if (!sessionCreationLocks[roomID]) {
        sessionCreationLocks[roomID] = { locked: false, queue: [] };
    }
    return sessionCreationLocks[roomID];
}

async function createSession(roomID, firstUserID, otherUserID, otherUsername, currentUserUsername) {
    try {
        const userMap = {
            [firstUserID]: currentUserUsername, 
            [otherUserID]: otherUsername 
        };
        const newSession = new FriendRequestSession({ userMap, 
            sender:firstUserID, receiver:otherUserID, roomID:roomID });
        return await newSession.save();
    } catch (error) {
        throw error;
    }
}


//
router.post('/create_frq/:roomID/:otherUserID', async (req, res) => {
    try { //requires roomid, otheruserid, currentuserid
        const roomID = req.params.roomID;
        const currentChatSession = await ChatSession.findOne({roomID:roomID})
        if (!currentChatSession) {
            return res.status(400).json({ message: 'Invalid chat session.' });
        }
        const currentUserID = req.body.currentUserID;
        const otherUserID = req.params.otherUserID;
        //const otherUser = await User.findById(otherUserID);
        //const currentUser = await User.findById(currentUserID);
        const {userMap} = currentChatSession
        const currentPublicUsername = userMap[currentUserID]
        const otherPublicUsername = userMap[otherUserID]
        console.log("current and other", currentUserID, otherUserID)
        console.log("current and other usernames", currentPublicUsername, otherPublicUsername)
        
        if (currentUserID === otherUserID) {
            return res.status(400).json({ success:false, message: 'Cannot make request to yourself' });
        }
        const lock = getOrCreateLock(roomID);
        if (lock.locked) {
            return res.status(400).json({ success:false, message: 'Session creation is already in progress for this room' });
        }
        lock.locked = true;
        let existingSession = await FriendRequestSession.findOne({ roomID:roomID });
        if (existingSession) return res.status(409).send({ message: "The frq session already exists." });
        try {
            const session = await createSession(roomID, currentUserID, otherUserID, otherPublicUsername, currentPublicUsername);
            lock.locked = false;
            res.status(200).json({ success: true, session });
        } catch (error) {
            console.log(error)
            lock.locked = false;
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to add user: ${error}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.delete('/delete_frq/:roomID/:otherUserID/:authUser', async (req, res) => {
    try {
        const roomID = req.params.roomID;
        const currentUserID = req.params.authUser;
        const otherUserID = req.params.otherUserID;
        console.log("room cur other", roomID, currentUserID, otherUserID)

        const currentChatSession = await ChatSession.findOne({ roomID: roomID });
        if (!currentChatSession) {
            return res.status(400).json({ success: false, message: 'Invalid chat session.' });
        }

        const friendRequestSession = await FriendRequestSession.findOne({ roomID: roomID, sender: currentUserID, receiver: otherUserID });
        if (!friendRequestSession) {
            return res.status(400).json({ success: false, message: 'Friend request session not found.' });
        }

        await friendRequestSession.deleteOne();

        return res.status(200).json({ success: true, message: 'Friend request session deleted successfully.' });
    } catch (error) {
        console.error('Error deleting friend request session:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.delete('/reject_frq/:roomID/:otherUserID/:authUser', async (req, res) => {
    try {
        const roomID = req.params.roomID;
        const currentUserID = req.params.authUser;
        const otherUserID = req.params.otherUserID;

        const currentChatSession = await ChatSession.findOne({ roomID: roomID });
        if (!currentChatSession) {
            return res.status(400).json({ success: false, message: 'Invalid chat session.' });
        }

        const friendRequestSession = await FriendRequestSession.findOne({ roomID: roomID, sender: otherUserID, receiver: currentUserID });
        if (!friendRequestSession) {
            return res.status(400).json({ success: false, message: 'Friend request session not found.' });
        }

        await friendRequestSession.deleteOne();

        return res.status(200).json({ success: true, message: 'Friend request rejected successfully.' });
    } catch (error) {
        console.error('Error rejecting friend request session:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.post('/accept_frq/:roomID/:otherUserID/:authUser', async (req, res) => {
    try {
        const roomID = req.params.roomID;
        const currentUserID = req.params.authUser; 
        const otherUserID = req.params.otherUserID;

        let currentChatSession = await ChatSession.findOne({ roomID: roomID });
        if (!currentChatSession) {
            return res.status(400).json({ success: false, message: 'Invalid chat session.' });
        }

        const friendRequestSession = await FriendRequestSession.findOne({ roomID: roomID, sender: otherUserID, receiver: currentUserID });
        if (!friendRequestSession) {
            return res.status(400).json({ success: false, message: 'Friend request session not found.' });
        }

        const currentUser = await User.findById(currentUserID);
        if (currentUser.friendList.includes(otherUserID)) {
            return res.status(400).json({ success: false, message: 'The user is already in your friend list.' });
        }

        const otherUser = await User.findById(otherUserID);
        if (otherUser.friendList.includes(currentUserID)) {
            return res.status(400).json({ success: false, message: 'You are already in the user\'s friend list.' });
        }

        await User.findByIdAndUpdate(currentUserID, { $push: { friendList: otherUserID } });
        await User.findByIdAndUpdate(otherUserID, { $push: { friendList: currentUserID } });

        await friendRequestSession.deleteOne();
        const updatedChatSessions = await ChatSession.updateMany(
            { roomID: roomID },
            { $set: { [`userMap.${otherUserID}`]: otherUser.username,
            [`userMap.${currentUserID}`]: currentUser.username } },
            { new: true }
        );
        

        console.log("cs session", currentChatSession.userMap)

        return res.status(200).json({ success: true, message: 'Friend request accepted successfully.' });
    } catch (error) {
        console.error('Error accepting friend request session:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.delete('/remove_friend/:roomID/:otherUserID/:authUser', async (req, res) => {
    try {
        const roomID = req.params.roomID;
        const currentUserID = req.params.authUser
        const otherUserID = req.params.otherUserID;

        await User.findByIdAndUpdate(currentUserID, { $pull: { friendList: otherUserID } });

        await User.findByIdAndUpdate(otherUserID, { $pull: { friendList: currentUserID } });
        try {
        const updatedChatSessions = await ChatSession.updateMany(
            { roomID: roomID },
            { $set: { [`userMap.${otherUserID}`]: generateRandomUsername(),
            [`userMap.${currentUserID}`]: generateRandomUsername() } },
            { new: true }
        ); } catch (error) {
            console.log("err",error)
        }
        console.log("updated cs")
        return res.status(200).json({ success: true, message: 'Friend removed successfully.' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});





router.get('/check_frq_status/:otherUserID/:currentUserID', async (req, res) => {
    try {
        const currentUserID = req.params.currentUserID;
        const otherUserID = req.params.otherUserID
        const sessions = await FriendRequestSession.find({
            $or: [
                { sender: currentUserID, receiver: otherUserID },
                { sender: otherUserID, receiver: currentUserID }
            ]
        });
        const currentUser = await User.findById(currentUserID);
        
        const otherUser = await User.findById(otherUserID)
        const otherFriendList = otherUser.friendList.map(friend => friend.toString());
        // If no sessions found, return status: add
        if (sessions.length === 0 && !otherFriendList.includes(currentUserID)) {
            return res.status(200).json({ status: 'add' });
        }

        if (sessions.length ===0 && otherFriendList.includes(currentUserID)) {
            return res.status(200).json({ status: 'remove' });
        }
        
        const senderSession = sessions.find(session => session.sender === currentUserID);
        const receiverSession = sessions.find(session => session.receiver === currentUserID);
        
        if (senderSession) {
            return res.status(200).json({ status: 'cancel' });
        }
        
        if (receiverSession) {
            return res.status(200).json({ status: 'accept/reject' });
        }
        
        return res.status(200).json({ status: 'unknown' });
        
    } catch (error) {
        console.error('Error checking friend request status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});




module.exports = router;