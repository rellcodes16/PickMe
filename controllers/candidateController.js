const Candidate = require("../models/Candidate");
const VotingSession = require("../models/VotingSess");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");

exports.createCandidate = catchAsync(async (req, res, next) => {
    const { name, position, votingSessionId } = req.body;

    if (!name || !position || !votingSessionId) {
        return next(new AppError("All fields are required.", 400));
    }

    const votingSession = await VotingSession.findById(votingSessionId);
    if (!votingSession) {
        return next(new AppError("Voting session not found.", 404));
    }

    const profilePicture = req.file ? req.file.path : '';

    const newCandidate = await Candidate.create({ 
        name, 
        position, 
        votingSessionId, 
        profilePicture 
    });

    votingSession.candidates.push(newCandidate._id);
    await votingSession.save();

    res.status(201).json({ message: "Candidate created successfully!", candidate: newCandidate });
});

exports.getCandidates = catchAsync(async (req, res, next) => {
    const { votingSessionId } = req.params;

    const candidates = await Candidate.find({ votingSessionId });

    if (!candidates.length) {
        return next(new AppError("No candidates found for this session.", 404));
    }

    res.status(200).json({ candidates });
});

exports.updateCandidate = catchAsync(async (req, res, next) => {
    const { candidateId } = req.params;
    const { name, position } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return next(new AppError("Candidate not found.", 404));

    if (name) candidate.name = name;
    if (position) candidate.position = position;
    if (req.file) candidate.profilePicture = req.file.path; 

    await candidate.save();

    res.status(200).json({
        message: "Candidate updated successfully!",
        candidate,
    });
});
