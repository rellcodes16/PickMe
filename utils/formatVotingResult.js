const Vote = require("../models/Vote");
const Candidate = require("../models/Candidate");

const formatVotingResult = async (sessionId) => {
    const votes = await Vote.find({ votingSession: sessionId });
    console.log("votess", votes)

    const candidateIds = [...new Set(votes.map(v => v.candidate.toString()))];


    const candidates = await Candidate.find({ _id: { $in: candidateIds } }).populate("userId");


    console.log("candidatesss", candidates)

    const candidateMap = {};
    candidates.forEach(c => {
        candidateMap[c._id.toString()] = {
            name: c.userId?.name || "Candidate",
            profilePic: c.profilePicture,
            
            position: c.position
        };
    });

    let resultByPosition = {};

    votes.forEach(vote => {
        const id = vote.candidate.toString();
        const info = candidateMap[id];

        if (!info) {
            console.warn(`No candidate metadata found for ID: ${id}`);
            return;
        }
        const position = info.position;

        if (!resultByPosition[position]) {
            resultByPosition[position] = {};
        }

        if (!resultByPosition[position][id]) {
            resultByPosition[position][id] = {
                name: info.name,
                profilePic: info.profilePic,
                votes: 0
            };
        }

        resultByPosition[position][id].votes += 1;
    });

    const finalFormattedResult = {};
    const positionWinners = {};

    Object.keys(resultByPosition).forEach(position => {
        const candidates = resultByPosition[position];
        let totalVotes = 0;

        Object.values(candidates).forEach(c => totalVotes += c.votes);

        const resultArray = Object.entries(candidates).map(([id, data]) => ({
            id,
            ...data,
            percentage: ((data.votes / totalVotes) * 100).toFixed(2)
        }));

        const winner = resultArray.reduce((a, b) => a.votes > b.votes ? a : b);

        finalFormattedResult[position] = resultArray;
        positionWinners[position] = winner;
    });

    return { finalFormattedResult, positionWinners };
};

module.exports = formatVotingResult;
