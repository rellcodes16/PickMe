const mongoose = require('mongoose')

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true},
    profilePicture: { type: String },
    adminIds: [{type: mongoose.Schema.Types.ObjectId, ref:'User'}],

})

module.exports = mongoose.model('Organization', OrganizationSchema)