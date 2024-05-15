const router = require('express').Router();
const {User}= require("../models/userdb");
const Token = require("../models/token");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');
const bcrypt= require('bcrypt');
const path = require('path');

//user enters email and clicks reset pw button, triggers this post rq and sends pw reset link
router.post("/", async(req,res) => {
    try {
        const emailSchema = Joi.object({
            email: Joi.string().email().required().label("Email"),
        });
        const {error} = emailSchema.validate(req.body);
        if (error) return res.status(400).send({message:error.details[0].message});
        let user=await User.findOne({email: req.body.email});
        if (!user) {
            return res.status(409).send({message: "User with given email does not exist."});
        }
        let token = await Token.findOne({ userId: user._id});
        if (!token) {
            token = await new Token({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
        }
        const url = `${process.env.FRONTEND_URL}/password-reset/${user._id}/${token.token}/`;
        await sendEmail(user.email, "Password Reset", url);
        res.status(200).send({ message: "Password reset link sent to your email"});
    } catch (error) {
        res.status(500).send({message: "Internal Server Error"});
    }
});

//verify pw reset link, ran when PW reset jsx is rendered
router.get("/:id/:token", async (req,res) => {
    try {
        const user = await User.findOne({_id: req.params.id});
        if (!user) return res.status(400).send({message: "Invalid Link"});
        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token,    
        });
        if (!token) return res.status(400).send({message: "Invalid Link"});
        res.status(200).send({ message: "Valid Link" });
    } catch (error) {
        console.log(error)
        res.status(500).send({message: "Internal Server Error"});
    }
})




//when user on reset pw form, sets new pw
router.post("/:id/:token", async(req,res) => {
    try {
        const passwordSchema = Joi.object({
            password: Joi.string().required().label("Password"),
        });
        const {error} = passwordSchema.validate(req.body);
        if (error) return res.status(400).send({message: error.details[0].message});
        const user = await User.findOne({_id:req.params.id});
        if (!user) return res.status(400).send({message: "Invalid Link"});
        const token = await Token.findOne({
            userId:user._id,
            token: req.params.token,
        });
        if (!token) return res.status(400).send({message: "Invalid Link"});
        if (!user.verified) user.verified = true;
        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashPassword;
        await user.save();
        await token.deleteOne();
        res.status(200).send({message: "Password reset successfully"});
    } catch (error) {
        console.log(error)
        res.status(500).send({message: "Internal Server Error"});
    }
})

module.exports = router;