const mongoose = require('mongoose')

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true},
    profilePicture: { type: String },
    roles: [{
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        role: {
            type: String,
            enum: ['admin', 'voter'],
            default: 'voter'
        }
    }],
    validEmailDomains: [{type: String }]

})

module.exports = mongoose.model('Organization', OrganizationSchema)