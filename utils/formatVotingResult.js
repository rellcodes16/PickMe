const prisma = require('../src/config/prisma');

const formatVotingResult = async (sessionId) => {
    const votes = await prisma.vote.findMany({
        where: { votingSessionId: sessionId },
        include: {
            candidate: {
                include: {
                    user: { select: { name: true, profilePicture: true } }
                }
            }
        }
    });

    console.log("votes", votes);

    if (!votes.length) return { finalFormattedResult: {}, positionWinners: {} };

    let resultByPosition = {};

    votes.forEach(vote => {
        const candidate = vote.candidate;
        const position = candidate.position;
        const candidateId = candidate.id;

        if (!resultByPosition[position]) resultByPosition[position] = {};

        if (!resultByPosition[position][candidateId]) {
            resultByPosition[position][candidateId] = {
                name: candidate.user?.name || "Candidate",
                profilePic: candidate.user?.profilePicture || null,
                votes: 0
            };
        }

        resultByPosition[position][candidateId].votes += 1;
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