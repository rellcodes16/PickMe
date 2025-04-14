const VotingSession = require("../models/VotingSess");
const formatVotingResult = require("../utils/formatVotingResult");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");

exports.getResultsBySession = catchAsync(async (req, res, next) => {
  const sessionId = req.params.sessionId;

  const session = await VotingSession.findById(sessionId);
  if (!session) return next(new AppError("Voting session not found", 404));
  if (session.status !== "closed") return next(new AppError("Results are not available yet", 403));

  const { finalFormattedResult, positionWinners } = await formatVotingResult(sessionId);

  res.status(200).json({
    status: "success",
    session: {
      id: session._id,
      title: session.title,
      startDate: session.startDate,
      endDate: session.endDate,
    },
    results: finalFormattedResult,
    winners: positionWinners,
  });
});

exports.getAllResults = catchAsync(async (req, res, next) => {
    const user = req.user; 
    const orgId = req.query.organization;
  
    const sessions = await VotingSession.find({
      organization: orgId || { $in: user.organizationIds },
      status: "closed"
    }).sort({ endDate: -1 });
  
    const results = await Promise.all(
      sessions.map(async (session) => {
        const { positionWinners } = await formatVotingResult(session._id);
  
        return {
          sessionId: session._id,
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
  