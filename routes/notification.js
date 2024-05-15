const router = require('express').Router();
const { User, validate } = require('../models/userdb');
const mongoose = require('mongoose');

router.post('/get_notifications', async (req, res) => {
    try {
        // Find the current user by ID
        const currentUser = await User.findById(req.body.userID);
        const currentUserRequestList = currentUser?.requestList;
        const promises = [];

        // Iterate through the currentUserRequestList
        currentUserRequestList.forEach((userId) => {
            // Push each asynchronous operation to an array of promises
            promises.push(
                User.findById(userId).select('_id username') // Select only _id and username fields
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


})


module.exports = router;