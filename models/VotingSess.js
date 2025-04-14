const mongoose = require('mongoose')

const VotingSessionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    organization: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Organization", 
        required: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    startDate: { 
        type: Date, 
        required: true 
    },
    endDate: { 
        type: Date, 
        required: true 
    },
    votes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Vote"  
    }], 
    candidates: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Candidate" 
    }],
    voters: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    status: { 
        type: String, 
        enum: ["pending", "active", "closed"], 
        default: "pending" 
    }
}, { timestamps: true });

module.exports = mongoose.model("VotingSession", VotingSessionSchema);

