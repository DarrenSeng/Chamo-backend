const express = require('express');
const router = express.Router();
const ReportForm = require('../models/reportForm');
const mongoose = require('mongoose');

router.post("/", async (req, res) => {
    try {
        const username = req.body.username
        const userID = req.body.userID
        const request = req.body.request

        const newReportForm = new ReportForm({
            username: username,
            userID: userID,
            ReportForm: request
        })

        newReportForm.save()
            .then((doc) => {
                console.log('Document for report form saved successfully:', doc);
                res.status(200).send({message: "Request for report form was sent successfully."});
            })
            .catch((error) => {
                console.error('Error saving document:', error);
                res.status(400).send({message: "Request for report form failed to send."});
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