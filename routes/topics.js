const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Topic = require('../models/topic')
const multer = require('multer');
const upload = multer();
const Jimp = require('jimp');


router.post("/create_topic", upload.single('topicImage'), async (req, res) => {
    try {

           // Load the uploaded image buffer using Jimp
           const image = await Jimp.read(req.file.buffer);

           // Resize the image to a maximum resolution of 800x600
           image.resize(800, 600);
   
           // Convert the resized image buffer to a base64 string
           const resizedImageBuffer = await image.getBufferAsync(Jimp.AUTO);
      

        // Create a session obj
        const newTopic = new Topic({
            topicCreator: req.body.topicCreator,
            topicTitle: req.body.topicTitle,
            topicDescription: req.body.topicDescription,
            subscribers: req.body.subscribers,
            topicImage: {
                data: resizedImageBuffer, // Access the uploaded image data
                contentType: req.file.mimetype // Access the content type of the uploaded image
            }
        })

        // Write session info to DB
        await newTopic.save()
        res.status(200).send({ message: "Topic was successfully created" });
    } catch (error) {
        console.log(error);
    }
})

//when user updates new topic
router.post("/update_topic", async (req, res) => {
    // Assuming req.body.userID and req.body.title are available
    const userID = req.body.userID;
    const title = req.body.title;

    // Search for the topic in the database
    Topic.findOne({ topicCreator: userID, topicTitle: title })
        .then(topic => {
            if (topic) {
                // Topic found, you can update it here
                // For example, you might want to update its description or image
                topic.title = req.body.title
                topic.topicDescription = req.body.topicDescription;
                topic.topicImage = req.body.topicImage;

                // Save the updated topic
                topic.save()
                    .then(updatedTopic => {
                        // Handle success
                        console.log('Topic updated successfully:', updatedTopic);
                        res.status(200).json(updatedTopic); // Send updated topic as response if needed
                    })
                    .catch(error => {
                        // Handle error while saving the updated topic
                        console.error('Error updating topic:', error);
                        res.status(500).send('Internal Server Error');
                    });
            } else {
                // Topic not found
                console.log('Topic not found');
                res.status(404).send('Topic not found');
            }
        })
        .catch(error => {
            // Handle error while searching for the topic
            console.error('Error finding topic:', error);
            res.status(500).send('Internal Server Error');
        });
})

//when user deletes new topic
router.post("/delete_topic", async (req, res) => {
    // Assuming req.body.userID and req.body.title are available
    const userID = req.body.userID;
    const title = req.body.title;

    // Search for the topic in the database
    Topic.findOneAndDelete({ topicCreator: userID, topicTitle: title })
        .then(deletedTopic => {
            if (deletedTopic) {
                // Topic found and deleted successfully
                console.log('Topic deleted successfully:', deletedTopic);
                res.status(200).json({ message: 'Topic deleted successfully' }); // Send success message as response if needed
            } else {
                // Topic not found
                console.log('Topic not found');
                res.status(404).send('Topic not found');
            }
        })
        .catch(error => {
            // Handle error while searching for or deleting the topic
            console.error('Error deleting topic:', error);
            res.status(500).send('Internal Server Error');
        });
})

//when user deletes new topic
router.post("/add_subscriber", async (req, res) => {
    // Assuming req.body.creatorUserID and req.body.topicID are available
    const creatorUserID = req.body.creatorUserID;
    const topicID = req.body.topicID;
    const newSubscriberID = req.body.newSubscriberID;

    // Update the subscribers array of the topic
    Topic.findOneAndUpdate(
        { topicCreator: creatorUserID, _id: topicID },
        { $push: { subscribers: newSubscriberID } },
        { new: true } // Return the updated document
    )
        .then(updatedTopic => {
            if (updatedTopic) {
                // Topic found and updated successfully
                console.log('Subscriber added successfully:', updatedTopic);
                res.status(200).json(updatedTopic); // Send updated topic as response if needed
            } else {
                // Topic not found
                console.log('Topic not found');
                res.status(404).send('Topic not found');
            }
        })
        .catch(error => {
            // Handle error while searching for or updating the topic
            console.error('Error adding subscriber:', error);
            res.status(500).send('Internal Server Error');
        });
})

//when user deletes new topic
router.post("/remove_subscriber", async (req, res) => {
    // Assuming req.body.creatorUserID and req.body.topicID are available
    const creatorUserID = req.body.creatorUserID;
    const topicID = req.body.topicID;
    const subscriberIDToRemove = req.body.subscriberIDToRemove;

    // Update the subscribers array of the topic
    Topic.findOneAndUpdate(
        { topicCreator: creatorUserID, _id: topicID },
        { $pull: { subscribers: subscriberIDToRemove } },
        { new: true } // Return the updated document
    )
        .then(updatedTopic => {
            if (updatedTopic) {
                // Subscriber removed successfully
                console.log('Subscriber removed successfully:', updatedTopic);
                res.status(200).json(updatedTopic); // Send updated topic as response if needed
            } else {
                // Topic not found
                console.log('Topic not found');
                res.status(404).send('Topic not found');
            }
        })
        .catch(error => {
            // Handle error while searching for or updating the topic
            console.error('Error removing subscriber:', error);
            res.status(500).send('Internal Server Error');
        });
})

// For rendering topics
router.get('/render_topics', async (req, res) => {
    try {
        // Fetch all topics from the database
        const topics = await Topic.find({ verified: true });
        

        // Send the topics as JSON in the response
        res.status(200).json(topics);
    } catch (error) {
        console.error('Error rendering topics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



//for debugging purposes to see list of users, delete when finished
router.get('/', async (req, res) => {
    try {
        return res.status(200);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router