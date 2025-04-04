const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, 
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

}, { timestamps: true });

voteSchema.index({ user: 1, votingSession: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);
module.exports = Vote;
