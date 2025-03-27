const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    position: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
    },
    votingSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VotingSess",
        required: true,
    },
    votes: {
        type: Number,
        default: 0, 
    },
});

module.exports = mongoose.model("Candidate", candidateSchema);

