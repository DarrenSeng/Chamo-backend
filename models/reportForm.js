const mongoose = require("mongoose")


const msgSchema = new mongoose.Schema({
    username: {type: String},
    userID: {type: mongoose.Types.ObjectId},
    ReportForm: {type: String},
    timeStamp: {type: Date, default: Date.now}
});

const ReportForm = mongoose.model('report_form', msgSchema)

module.exports = ReportForm

