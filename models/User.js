const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator')

const UserSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: [true, 'Please tell us your name'], 
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'Please provide your email'], 
        unique: true, 
        lowercase: true, 
        validate: [validator.isEmail, 'Please provide your email']
    },
    password: { 
        type: String, 
        required: [true, 'Please provide your password'], 
        select: false,
        minlength: 8,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        vaidate: {
            validator: function(el) {
                return el === this.password
            },
            message: 'Passwords are not the same!',
        }
    },
    passwordResetToken : String,
    passwordResetExpires: Date,
    role: { 
        type: String, 
        enum: ['admin', 'voter'], 
        default: 'voter' 
    },
    organizationIds: [{ 
        type: mongoose.Schema.ObjectId, 
        ref: 'Organization',
        default: []
    }],
    pendingInvites: [{
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },
        role: {
            type: String,
            enum: ['admin', 'voter']
        },
        token: String,
    }],
    passwordChangedAt: Date
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); 

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

UserSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', UserSchema);
