const express = require('express');
const router = express.Router();
const HelpRequest = require('../models/helpRequest');
const mongoose = require('mongoose');

router.post("/", async (req, res) => {
    try {
        const username = req.body.username
        const userID = req.body.userID
        const request = req.body.request

        const newHelpRequest = new HelpRequest({
            username: username,
            userID: userID,
            HelpRequest: request
        })

        newHelpRequest.save()
            .then((doc) => {
                console.log('Document saved successfully:', doc);
                res.status(200).send({message: "Request was sent successfully."});
            })
            .catch((error) => {
                console.error('Error saving document:', error);
                res.status(400).send({message: "Request failed to send."});
            })


    } catch (error) {
        console.log(error);
    }
})


// Retrieves request from DB and renders it to admin page
router.get('/', async (req, res) => {
    try {

    } catch (error) {

    }
});

module.exports = router