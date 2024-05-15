const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity")


const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    requestList: [{ type: mongoose.Types.ObjectId, default: false, ref: 'Request' }],
    roomList: [{
        userID: { type: mongoose.Types.ObjectId },
        roomID: { type: String }
    }],
    usersList: [{ type: mongoose.Types.ObjectId, default: false, ref: 'Users' }],
    blockList: [{ type: mongoose.Types.ObjectId, default: false, ref: 'BlockedUsers' }],
    friendList: [{ type: mongoose.Types.ObjectId, default: false, ref: 'Friend' }],
    // new profile fields
    age: { type: Number },
    location: { type: String },
    bio: { type: String },
    topics: [{ type: String }],
    personalityTypes: [{ type: String, enum: ["ISTJ", 
    "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"] }],
    iconColor: { type: String, String, enum: ["#526275", "#6B0842", "#A61F21", "#B8671F", "#D5DB8C", "#61B38F", "#2D924A", "#126FA2", "#56028F", "#ffffff"] },
});


userSchema.methods.generateAuthToken = () => {
    const token = jwt.sign({ _id: this._id }, process.env.JWTPRIVATEKEY, {
        expiresIn: "7d",
    });
    return token
};

const User = mongoose.model('User', userSchema);

const validate = (data) => {
    const schema = Joi.object({
        firstName: Joi.string().required().label("First Name"),
        lastName: Joi.string().required().label("Last Name"),
        email: Joi.string().required().label("Email"),
        username: Joi.string().required().label("Username"),
        password: Joi.string().required().label("Password"),
        age: Joi.number().label("Age"),
        location: Joi.string().label("Location"),
        bio: Joi.string().label("Bio"),
        topics: Joi.array().label("Topics"),
        personalityTypes: Joi.array().label("Personality Types"),
        iconColor: Joi.string().label("Icon Color"),
    })
    return schema.validate(data);
}

module.exports = { User, validate };