const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    votingSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VotingSess",
        required: true,
    },
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
        required: true,
    },
    position: {
        type: String,
        required: true,
    }

}, { timestamps: true });

const Vote = mongoose.model("Vote", voteSchema);
module.exports = Vote;
