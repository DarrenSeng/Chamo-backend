const { ChatSession } = require('../models/messagedb');
const router = require('express').Router();
const mongoose = require('mongoose');

const sessionCreationLocks = {};

function getOrCreateLock(roomID) {
    if (!sessionCreationLocks[roomID]) {
        sessionCreationLocks[roomID] = { locked: false, queue: [] };
    }
    return sessionCreationLocks[roomID];
}
function generateRandomUsernames(usersID) {
    const userMap = {};
    usersID.forEach(userID => {
        const randomUsername = generateRandomUsername();
        userMap[userID] = randomUsername;
    });
    return userMap;
}


function generateRandomUsername() {
    // replace hardcoded with separate file for adjs and animals. maybe add file to gitignore
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

async function createSession(roomID, usersID, topicName) {
    const userMap = generateRandomUsernames(usersID)
    try {
        const newSession = new ChatSession({
            userMap,
            roomID,
            topicName,
            messages: []
        });
        return await newSession.save();
    } catch (error) {
        throw error;
    }
}

async function getSession(roomID) {
    return await ChatSession.findOne({ roomID });
}

router.get('/get-chatsession/:roomID', async (req, res) => {
    try {
        const roomID = req.params.roomID;
        const session = await ChatSession.findOne({ roomID });
        if (!session) {
            return res.status(200).json(null)
        }
        //when you retrieve session, find the other user
        //retrieve that user's icon color. append at end of session
        return res.status(200).json({ session });
    } catch (error) {
        console.error('Error fetching recent message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/loading-messages', async (req, res) => {
    const roomID = req.body.roomID;
    const usersID = req.body.usersID;
    const topicName = req.body.topicName;
    const lock = getOrCreateLock(roomID);

    // Check if session creation is already in progress for this room ID
    if (lock.locked) {
        console.log(`Session creation is already in progress for room ${roomID}`);
        // Wait until session creation is completed and then return the session
        lock.queue.push(res);
        return;
    }

    // Lock the session creation process
    lock.locked = true;

    try {
        let session = await getSession(roomID);

        if (!session) {
            session = await createSession(roomID, usersID,topicName);
        }

        const listOfMessages = session.messages || null;
        res.send(listOfMessages);

        if (lock.queue.length > 0) {
            const nextResponse = lock.queue.shift();
            nextResponse.send(listOfMessages);
        }
    } catch (error) {
        console.error('Error fetching/loading messages:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        lock.locked = false;
    }
});

router.get('/recent-message/:roomID', async (req, res) => {
    try {
        const roomID = req.params.roomID;
        const session = await ChatSession.findOne({ roomID });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        const latestMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;

        return res.status(200).json({ latestMessage });
    } catch (error) {
        console.error('Error fetching recent message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;





