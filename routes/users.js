const express = require('express');
const router = express.Router();
const { User, validate } = require('../models/userdb');
const Topic = require('../models/topic')
const Token = require("../models/token");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { ChatSession } = require('../models/messagedb')



//when user creates new acc
router.post("/", async(req, res) => {
    try {
        const { error } = validate(req.body);
        if (error) {
            return res.status(400).send({ message: error.details[0].message });
        }
        let user = await User.findOne({ email: req.body.email });
        if (user) return res.status(409).send({ message: "User with given email already exists." });
        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);
        user = await new User({...req.body, password: hashPassword }).save();
        const token = await new Token({
            userId: user._id,
            token: crypto.randomBytes(32).toString("hex"),
        }).save();
        const url = `http://localhost:3001/api/users/${user.id}/verify/${token.token}`;
    } catch (error) {
        console.log(error);
    }
});

router.get("/:id/verify/:token/", async(req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
        if (!user) return res.status(400).send({ message: "Invalid Link" });
        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token,
        });
        if (!token) return res.status(400).send({ message: "Invalid Link" });
        await user.updateOne({ verified: true });
        await token.deleteOne();
        res.status(200).send({ message: "Email Verified Successfully" });
    } catch (error) {
        console.log(error);
    }
});

router.get('/get-roomlist/:userID', async(req, res) => {
    try {
        const user = await User.findById(req.params.userID);
        return res.status(200).json(user.roomList);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/get-userslist/:userID', async(req, res) => {
    try {
        const user = await User.findById(req.params.userID);
        return res.status(200).json(user.usersList);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:authUser', async(req, res) => {
    try {
        const user = await User.findById(req.params.authUser);
        return res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/get_public_names/:roomID', async(req, res) => {
    try {
        const users = await ChatSession.findOne({ roomID: req.params.roomID });
        return res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching public users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/send_req/:userID', async(req, res) => {
    try {
        const currentUserID = req.body.currentUserID
        const otherUserID = req.params.userID
        const otherUser = await User.findById(otherUserID)

        try {
            if (currentUserID === otherUser._id) return res.send({ success: false, message: 'Can\'t add yourself' })

            await User.findByIdAndUpdate(
                otherUserID, { $addToSet: { requestList: currentUserID } },
            );
            return res.send({ success: true, message: "request created" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to add user: ${error}`)
    }
})

router.post('/add_user/:userID', async(req, res) => {
    try {
        const currentUserID = req.body.currentUserID
        const otherUserID = req.params.userID
        const otherUser = await User.findById(otherUserID)

        try {
            if (currentUserID === otherUser._id) return res.send({ message: 'Can\'t add yourself' })

            await User.findByIdAndUpdate(
                currentUserID, { $pull: { requestList: otherUserID } }
            )

            await User.findByIdAndUpdate(
                currentUserID, { $addToSet: { friendList: otherUser._id } },
            );
            await User.findByIdAndUpdate(
                otherUserID, { $addToSet: { friendList: currentUserID } },
            );
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to add user: ${error}`)
    }
})



router.post('/results', async(req, res) => {
    try {
        const users = await User.find({ username: { $regex: new RegExp(req.body.input, 'i') } }, { username: 1, id: 1 });
        const topics = await Topic.find({ name: { $regex: new RegExp(req.body.input, 'i') } });
        if (users.length === 0 && topics.length === 0) {
            return res.status(200).json({ usersFound: false, message: 'No users or topics found with the specified username' });
        }
        return res.status(200).json({ users, topics, usersFound: true, topicsFound: true });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/', async(req, res) => {
    try {
        const users = await User.find();
        console.log(users);
        return res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/:userId/profile', async(req, res) => {
    try {
        const userId = req.params.userId;
        const profileData = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            userId, {
                $set: {
                    firstName: profileData.firstName,
                    lastName: profileData.lastName,
                    age: profileData.age,
                    location: profileData.location,
                    bio: profileData.bio,
                    topics: profileData.topics,
                    personalityTypes: profileData.personalityTypes,
                    blockList: profileData.blockList,
                    iconColor: profileData.iconColor
                }
            }, { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/check_friend_status/:otherUserID/:authUser', async(req, res) => {
    try {
        const currentUserID = req.params.authUser; //passed in content
        const currentUser = await User.findOne({ _id: currentUserID });
        const otherUserID = req.params.otherUserID; //in route param
        const otherUser = await User.findById(otherUserID);
        //check if the other user's friendlist has you in it, if so, should show add button
        //check if other user's 
        try {
            if (!currentUser) {
                return res.status(404).json({ success: false, message: 'Current user not found' });
            }
            if (!otherUser) {
                return res.status(404).json({ success: false, message: 'Other user not found' });
            }
            let isBlocked = false
            if (currentUser.blockList) {
                isBlocked = currentUser.blockList.includes(otherUser._id);
            }
            res.status(200).json({ success: true, isBlocked });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to check block status: ${error}`);
    }
});

router.get('/check_block_status/:otherUserID/:authUser', async(req, res) => {
    try {
        const currentUserID = req.params.authUser; //passed in content
        const currentUser = await User.findOne({ _id: currentUserID });
        const otherUserID = req.params.otherUserID; //in route param
        const otherUser = await User.findById(otherUserID);

        try {
            if (!currentUser) {
                return res.status(404).json({ success: false, message: 'Current user not found' });
            }
            if (!otherUser) {
                return res.status(404).json({ success: false, message: 'Other user not found' });
            }
            let isBlocked = false
            if (currentUser.blockList) {
                isBlocked = currentUser.blockList.includes(otherUser._id);
            }
            res.status(200).json({ success: true, isBlocked });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to check block status: ${error}`);
    }
});

router.get('/blocklist/:userID', async(req, res) => {
    try {
        const userId = req.params.userID;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const blockList = user.blockList || [];
        return res.status(200).json({ success: true, blockList });
    } catch (error) {
        console.error('Error fetching block list:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



router.post('/block_user/:userID', async(req, res) => {
    try {
        const currentUserID = req.body.currentUserID;
        const currentUser = await User.findOne({ _id: currentUserID });
        const otherUserID = req.params.userID;
        const otherUser = await User.findById(otherUserID);
        try {
            if (currentUserID === otherUser._id) return res.send({ message: 'Cannot block yourself' });

            await User.findByIdAndUpdate(
                currentUserID, { $addToSet: { blockList: otherUser._id } },
            );
            if (currentUser.friendList) {
                console.log("friendlist", currentUser.friendList)
                if (currentUser.friendList.includes(otherUser._id)) {
                    await currentUser.updateOne({ $pull: { friendList: otherUser._id } });
                }
                res.status(200).json({ success: true })
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to add user: ${error}`);
    }
});

router.post('/unblock_user/:userID', async(req, res) => {
    try {
        const currentUserID = req.body.currentUserID;
        const currentUser = await User.findOne({ _id: currentUserID });
        const otherUserID = req.params.userID;
        const otherUser = await User.findById(otherUserID);

        try {
            if (!currentUser) {
                return res.status(404).json({ success: false, message: 'Current user not found' });
            }

            if (!otherUser) {
                return res.status(404).json({ success: false, message: 'Other user not found' });
            }
            if (!currentUser.blockList.includes(otherUser._id)) {
                return res.status(400).json({ success: false, message: 'Other user is not in the block list' });
            }
            await currentUser.updateOne({ $pull: { blockList: otherUser._id } });

            res.status(200).json({ success: true, message: 'User unblocked successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } catch (error) {
        console.log(`Error: Unable to remove user from block list: ${error}`);
    }
});

module.exports = router;