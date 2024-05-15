const express = require('express');
const router = express.Router();
const {User} = require('../models/userdb'); 
const Token = require("../models/token");
const Joi = require("joi")
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

router.get('/testroute', async(req,res) => {
    return res.json({message:'Test route is working!'})
})


//authenticating users
router.get('/', async (req,res) => {
    let isLoggedIn = false
    let user = null

    if (req.session.userID) {
        isLoggedIn = true
        await User.findById(req.session.userID, 'email' )
        .then((response) => {
            user = response 
        })
        .catch((error) => {
            console.log(error)
        })
    }
    return res.json({userId: req.session.userID, user:user, sid:req.sessionID, isLoggedIn:isLoggedIn})
})

//authentication when user logs in
router.post("/", async(req,res) => {
    try {
        const {error} = validate(req.body);
        if (error) return res.status(400).send({message: error.details[0].message});
    const user = await User.findOne({email: req.body.email});
    if (!user) return res.status(401).send({message: "Invalid Email or Password"});
    const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
    );
    if (!validPassword) return res.status(401).send({message: "Invalid Email or Password"});
    if (!user.verified) {
    }
    if (req.session.userID) { //destroy previous session when user logs in again
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying previous session:", err);
                return res.status(500).send({ message: "Internal Server Error" });
            }
        });
    }
    req.session.userID = user._id
    return res.status(200).json({
        userID: user._id,
        username: user.username, 
        sid: req.sessionID, 
        isLoggedIn: true
    })
    } catch (error) {
        console.log(error)
        res.status(500).send({message: "Internal Server Error"});

    }
});

router.post('/logout', async (req, res) => {
    req.session.destroy((error) => {
        if (error) throw error
        res.clearCookie('browsingSession').send({isLoggedIn: false})
    })
})

const verifyUser = (req,res,next) => {
    if (req.session.userID) return next()
    return res.json({isLoggedIn: false})
}

const validate = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label("Email"),
        password: Joi.string().required().label("Password"),
    });
    return schema.validate(data);
}

module.exports = router; 

