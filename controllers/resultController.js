const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");
const formatVotingResult = require("../utils/formatVotingResult");
const prisma = require('../src/config/prisma');

exports.getResultsBySession = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) return next(new AppError("Voting session not found", 404));
    if (session.status !== "closed") return next(new AppError("Results are not available yet", 403));

    const { finalFormattedResult, positionWinners } = await formatVotingResult(sessionId);

    res.status(200).json({
        status: "success",
        session: {
            id: session.id,
            title: session.title,
            startDate: session.startDate,
            endDate: session.endDate,
        },
        results: finalFormattedResult,
        winners: positionWinners,
    });
});

exports.getAllResults = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const orgId = req.query.organization;

    let organizationIds;

    if (orgId) {
        organizationIds = [orgId];
    } else {
        const memberships = await prisma.organizationMember.findMany({
            where: { userId },
            select: { organizationId: true }
        });
        organizationIds = memberships.map(m => m.organizationId);
    }

    const sessions = await prisma.votingSession.findMany({
        where: {
            organizationId: { in: organizationIds },
            status: 'closed'
        },
        orderBy: { endDate: 'desc' }
    });

    const results = await Promise.all(
        sessions.map(async (session) => {
            const { positionWinners } = await formatVotingResult(session.id);

            return {
                sessionId: session.id,
                title: session.title,
                startDate: session.startDate,
                endDate: session.endDate,
                hasResult: true,
                winners: Object.entries(positionWinners).reduce((acc, [pos, winner]) => {
                    acc[pos] = winner.name;
                    return acc;
                }, {}),
            };
        })
    );

    res.status(200).json({
        status: "success",
        results,
    });
});