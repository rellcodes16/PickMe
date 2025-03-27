const Vote = require("../models/Vote");
const VotingSession = require("../models/VotingSess");
const Candidate = require("../models/Candidate");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");

exports.castVote = catchAsync(async (req, res, next) => {
    const { votingSessionId, candidateId } = req.body;
    const userId = req.user._id;

    const votingSession = await VotingSession.findById(votingSessionId);
    if (!votingSession || votingSession.status !== "active") {
        return next(new AppError("Voting session is not active.", 400));
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
        return next(new AppError("Candidate not found.", 404));
    }

    const existingVote = await Vote.findOne({ user: userId, votingSession: votingSessionId });
    if (existingVote) {
        return next(new AppError("You have already voted in this session.", 400));
    }

    await Vote.create({ user: userId, votingSession: votingSessionId, candidate: candidateId });

    candidate.votes += 1;
    await candidate.save();

    if (!votingSession.voters.includes(userId)) {
        votingSession.voters.push(userId);
        await votingSession.save();
    }

    res.status(200).json({ message: "Vote cast successfully!" });
});

exports.getVotes = catchAsync(async (req, res, next) => {
    const { votingSessionId } = req.params;

    const votes = await Vote.find({ votingSession: votingSessionId }).populate("candidate")
        .populate("candidate", "name position") 
        .populate("user", "name email");

    if (!votes.length) {
        return next(new AppError("No votes found for this session.", 404));
    }

    res.status(200).json({ votes });
});
