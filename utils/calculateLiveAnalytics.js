function calculateLiveAnalytics(session) {
    const now = new Date();
    const sessionStart = new Date(session.startDate);
    const sessionEnd = session.endDate ? new Date(session.endDate) : now;
    const durationInHours = (sessionEnd - sessionStart) / 1000 / 60 / 60;

    let peakData = {};
    let peakType = durationInHours <= 24 ? "hourly" : "daily";

    session.votes.forEach(vote => {
        const voteTime = new Date(vote.timestamp);
        const key = peakType === "hourly"
            ? voteTime.getHours()
            : voteTime.toISOString().split("T")[0];

        peakData[key] = (peakData[key] || 0) + 1;
    });

    const peakVotingTime = Object.keys(peakData).reduce((a, b) => (peakData[a] > peakData[b] ? a : b), null);

    let positionResults = {};

    session.votes.forEach(vote => {
        const candidateId = vote.candidate._id.toString();
        const positionName = vote.candidate.position.name;

        if (!positionResults[positionName]) {
            positionResults[positionName] = {};
        }

        if (!positionResults[positionName][candidateId]) {
            positionResults[positionName][candidateId] = {
                name: vote.candidate.name,
                votes: 0
            };
        }

        positionResults[positionName][candidateId].votes += 1;
    });

    let positionWinners = {};
    let formattedResults = {};

    Object.keys(positionResults).forEach(position => {
        let maxVotes = 0;
        let winner = null;
        let totalVotes = 0;

        formattedResults[position] = [];

        Object.keys(positionResults[position]).forEach(candidateId => {
            const candidate = positionResults[position][candidateId];
            totalVotes += candidate.votes;

            formattedResults[position].push({
                name: candidate.name,
                votes: candidate.votes
            });

            if (candidate.votes > maxVotes) {
                maxVotes = candidate.votes;
                winner = { id: candidateId, name: candidate.name, votes: maxVotes };
            }
        });

        formattedResults[position] = formattedResults[position].map(candidate => ({
            ...candidate,
            percentage: ((candidate.votes / totalVotes) * 100).toFixed(2)
        }));

        positionWinners[position] = winner;
    });

    return {
        votingSessionId: session._id,
        votingSessionName: session.title,
        organizationId: session.organization._id,
        organizationName: session.organization.name,
        durationInHours,
        peakVotingTime,
        peakType,
        peakData,
        positionResults: formattedResults,
        positionWinners
    };
}

module.exports = calculateLiveAnalytics;
