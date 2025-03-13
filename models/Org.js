const mongoose = require('mongoose')

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true},
    adminIds: [{type: mongoose.Schema.Types.ObjectId, ref:'User'}]
})

module.exports = mongoose.model('Organization', OrganizationSchema)