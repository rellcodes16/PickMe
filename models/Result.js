const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  votingSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VotingSession",
    required: true,
    unique: true
  },
  results: {
    type: Object,
    required: true
  },
  winners: {
    type: Object,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Result", resultSchema);
