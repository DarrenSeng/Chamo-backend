const mongoose = require("mongoose")


const topicSchema = new mongoose.Schema({
    topicCreator: {type: mongoose.Types.ObjectId, required: true },
    topicTitle: {type: String, required: true},
    topicDescription: {type: String, required: true},
    subscribers: [{ type: mongoose.Types.ObjectId, default: false}],
    topicImage: {
        data: Buffer, // Buffer to store binary data (image)
        contentType: String // Content type of the image (e.g., "image/png", "image/jpeg", etc.)
    }
});


module.exports = mongoose.model('topics', topicSchema)