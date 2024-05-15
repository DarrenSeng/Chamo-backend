const nodemailer = require("nodemailer");

//used for first time account verification and password resetting
module.exports = async (email,subject,text) => {
    try {const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        service: process.env.SERVICE,
        port: Number(process.env.EMAIL_PORT),
        secure: Boolean(process.env.SECURE),
        auth: {user: process.env.USER, pass: process.env.PASS,},
    })
    await transporter.sendMail({
        from: process.env.USER, //to be replaced with chamo email
        to:email,
        subject:subject,
        text:text,
    });
    console.log("Email Sent successfully.");
    } catch (error) {
        console.log(error);
    }
}