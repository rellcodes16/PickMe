const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    position: {
        type: String,
        required: true,
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
