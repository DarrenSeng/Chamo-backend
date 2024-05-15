require("dotenv").config()
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser')

app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
const server = http.createServer(app)
const uri = process.env.MONGODB_URI;
const session = require("express-session")
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
    uri: uri,
    collection: 'browsingSessions'
});

const {Message,ChatSession,JoinSession, RevealSession, FriendRequestSession} = require("./models/messagedb");
const {User,validate} = require("./models/userdb")


const userRoutes = require('./routes/users');
const authRoutes = require("./routes/auth");
const passwordRestRoutes = require("./routes/passwordReset");
const messageRoutes = require('./routes/msg')
const helpRoutes = require('./routes/help');
const { timeStamp } = require("console");
const notificationRoutes = require('./routes/notification')
const topicRoutes = require('./routes/topics')
const revealRoutes = require('./routes/reveal')


app.use(session({
    name: "browsingSession",
    secret: 'your-secret-key', // Change this to a secure random string
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 90000000, // 7 days 30000=30 sec 900000=15 min 120000=2min
        httpOnly: false,
        sameSite: false
    },
    store: store
}));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))

app.use('/api/users', userRoutes) //Mount routes, needed so client components can make fetch calls to server side request
app.use('/api/auth', authRoutes)
app.use('/api/password-reset', passwordRestRoutes)
app.use('/api/msg', messageRoutes)
app.use('/api/help', helpRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/topic', topicRoutes)
app.use('/api/reveal', revealRoutes)





mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB!');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});





// Connects this server to localhost:3000, where the front-end is located.
const io = new Server(server, {
    cors: {
        // The link to our frontend
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

const fetchNewNotifications = async () => {
    try {
        // Find the current user by ID
        const currentUser = await User.findById(req.body.userID);
        const currentUserRequestList = currentUser?.requestList;
        const promises = [];

        // Iterate through the currentUserRequestList
        currentUserRequestList.forEach((userId) => {
            // Push each asynchronous operation to an array of promises
            promises.push(
                User.findById(userId).select('id username') // Select only _id and username fields
            );
        });

        // Wait for all promises to resolve
        const users = await Promise.all(promises);

        const usernamesArray = users
            .filter((user) => user !== null) // Filter out null values (in case a user is not found)
            .map((user) => ({ id: user._id, username: user.username })); // Map users to objects with id and username fields

        // console.log("username Array: " + usernamesArray);

        return res.status(200).json({ requestList: usernamesArray });
    } catch (error) {
        console.error('Error fetching current user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function generateRoomID() {
    let newRoomID;
    let isUnique = false;
    while (!isUnique) {
        newRoomID = new mongoose.Types.ObjectId().toString();
        const existingSession = await JoinSession.findOne({ roomID: newRoomID });
        if (!existingSession) {
            isUnique = true;
        }
    }
    return newRoomID;
}

io.on("connection", (socket) => {
    //console.log(`User joined: ${socket.id}`) //user id
    socket.on('join-noti-room', () => {
        socket.join('notificationRoom')
    })
    socket.on("join-room", (roomID) => { //should be renamed to something related to navigating to chat pg
        socket.join(roomID)
    })

    socket.on('join-pairing', async (data) => {
        try {
            const existingSession = await JoinSession.findOne({
                topicName: data.topicName,
                usersID: { $size: 1 } // Check for sessions with only one user
            });
            console.log("existing session",existingSession)
            if (existingSession) {
                existingSession.usersID.push(data.userID);
                await existingSession.save();
                socket.join(existingSession.roomID)
                io.to(existingSession.roomID).emit('session complete', 
                    { roomID: existingSession.roomID, usersID: existingSession.usersID,
                        message: "Session has been created." });
            } else {
                // Create a new session if no existing session is found
                const roomID = await generateRoomID();
                const newSession = new JoinSession({
                    usersID: [data.userID],
                    roomID: roomID,
                    topicName: data.topicName
                });
                socket.join(roomID)
                await newSession.save();
                socket.emit('session created', { roomID: roomID, message: "Session has been created." });
            }
        } catch (error) {
            console.error('Error creating/joining session:', error);
        }
    });
    socket.on('add-to-userslists', async (data) => {
        try { 
            await User.findByIdAndUpdate(
                data.userID,
                { $push: { usersList: { $each: [data.otherUserID], $position: 0 } } }
            );
        } catch (error) {
            console.error('Error updating user document:', error);
        }
    })
    socket.on('add-to-roomlist', async(data)=> {
        const newRoom = {userID:data.otherUserID, roomID:data.roomID}
        try {
            await User.findByIdAndUpdate(
                data.userID,
                { $push: { roomList: { $each: [newRoom], $position: 0 } } }
            );
        } catch (error) {
            console.error('Error updating user document:', error);
        }
    })



    socket.on('cancel-join', async ( roomID) => {
        try {
            const session = await JoinSession.findOne({roomID: roomID });
            if (session) {
                await session.deleteOne();
                socket.emit('session-deleted', {message: `Session at ${roomID} has been deleted`});
                console.log("session deleted")
            } else {
                console.log('Session not found:', roomID);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    });

    socket.on('leaveRoom', (roomID) => {
        socket.leave(roomID)
    });

    socket.on("send-msg", async(msgData, otherUserID) => {
        msgData.timeStamp = Date.now()
        await ChatSession.findOneAndUpdate({ roomID: msgData.roomID }, { $push: { messages: msgData } }, { upsert: true, new: true } // upsert: true creates a new document if no match is found, new: true returns the updated document
            ).then(() => {
                console.log('Message saved to the database!');
                socket.to(msgData.roomID).emit("receive-msg", msgData);
            })
            .catch(err => {
                console.log(err);
            });
            try {
                const currentUser = await User.findById(msgData.userID);
                const otherUser = await User.findById(otherUserID)
                const index = currentUser.roomList.findIndex(entry => entry.roomID === msgData.roomID);
                if (index !== -1) { //check if it exists
                    const room = currentUser.roomList.splice(index, 1)[0];
                    currentUser.roomList.unshift(room); //to front
                    console.log("cr roomlist", currentUser.roomList)
                    await currentUser.save();
                }
                const otherIndex = otherUser.roomList.findIndex(entry => entry.roomID === msgData.roomID);
                if (otherIndex !== -1) { 
                    const room = otherUser.roomList.splice(otherIndex, 1)[0];
                    otherUser.roomList.unshift(room); 
                    await otherUser.save();
                }
            } catch (error) {
                console.error('Error updating user document:', error);
            }
    })


    socket.on("up-msg", (data) => {
        console.log(data)
        console.log('Updated message:', data.message);
        msgData = new Message({
            _id: msgData.id,
            username: data.username,
            roomID: data.roomID,
            message: data.message
        });

        const filter = { _id: msgData.id };
        const update = { message: data.message };
        const upMsgDoc = Message.findOneAndUpdate(filter, update, {
                //new: true, // return document after update
                returnOrignal: false, // use instead of new attribute; works the same
                upsert: true
            })
            .then(() => {
                msgData.update;
                console.log('Message updated to the database!');
            })
            .catch(err => {
                console.log(err);
            });

        socket.to(data.roomID).emit("receive-upmsg", data)
        setInterval(async () => {
            const newNotifications = await fetchNewNotifications();
            if (newNotifications.length > 0) {
                // Emit 'new-notification' event to the 'notifications' namespace
                io.emit("new-notification", newNotifications);
            }
        }, 10000);
    })


    socket.on("del-msg", async(data) => {
        await ChatSession.findOneAndDelete({ roomID: data.roomID }, { $push: { messages: msgData } }, { upsert: true, new: true } // upsert: true creates a new document if no match is found, new: true returns the updated document
            ).then(() => {
                socket.to(data.roomID).emit("receive-msg", data);
            })
            .catch(err => {
                console.log(err);
            });


        socket.to(data.roomID).emit("receive-delmsg", data)
    })

    socket.on("disconnect", () => {
        //console.log(`user disconnected ${socket.id}`)
    })
})


const port = process.env.PORT || 3001;
server.listen(port)
console.log("server is running on port", port)