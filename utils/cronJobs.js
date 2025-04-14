console.log("✅ Cron job file loaded.");

const cron = require("node-cron");
const VotingSession = require("../models/VotingSess");
const User = require("../models/User");
const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/sendEmail");
const formatVotingResult = require("./formatVotingResult")
const Result = require("../models/Result")

let isRunning = false;

const processVotingSessions = catchAsync(async () => {
    if (isRunning) {
        console.log("⏳ Cron job already running. Skipping this cycle...");
        return;
    }

    isRunning = true;
    console.log(`[${new Date().toISOString()}] Checking for voting session updates...`);

    const now = new Date();
    console.log(`[${new Date().toISOString()}] Now (UTC):`, now);
    console.log(`Now (Lagos Time):`, now.toLocaleString("en-US", { timeZone: "Africa/Lagos" })); 

    const pendingSessions = await VotingSession.find({ 
        status: "pending", 
        startDate: { $lte: now } 
    });

    console.log(`Found ${pendingSessions.length} pending sessions to start.`);
    console.log("Pending Sessions:", pendingSessions);

    if (pendingSessions.length > 0) {
        console.log(`Starting ${pendingSessions.length} voting sessions...`);

        await VotingSession.updateMany(
            { _id: { $in: pendingSessions.map(session => session._id) }, status: "pending" },
            { $set: { status: "active" } }
        );

        console.log("✅ Pending voting sessions started.");

        for (const session of pendingSessions) {
            const { organization } = session;

            console.log(`✅ Started session: ${session.title}`);
            console.log(`🔍 Looking for users in organization: ${organization}`);

            if (organization) {
                const usersInOrganization = await User.find({ organizationIds: session.organization }).select("_id email");
                const userIds = usersInOrganization.map(user => user._id); 

                if (userIds.length === 0) {
                    console.log("⚠️ No users found. Skipping notifications.");
                }

                if (userIds.length > 0) {
                    const notifications = userIds.map(userId => ({
                        user: userId,
                        message: `The voting session "${session.title}" has started. You can now cast your votes!`,
                        type: "voting_start",
                        isRead: false
                    }));

                    console.log(`👥 Found ${userIds.length} users in organization`);

                    await Notification.insertMany(notifications);
                    const insertedNotifications = await Notification.find({ user: { $in: userIds.map(u => u._id) } });
                    console.log("🛠️ Fetched notifications after insert:", insertedNotifications);

                    console.log("📩 Notifications successfully inserted into DB.");

                    await Promise.all(usersInOrganization.map(user => {
                        return sendEmail({
                            email: user.email,
                            subject: `Voting has started!`,
                            html: `<p>The voting session <strong>${session.title}</strong> has started. You can now cast your votes!</p>`
                        });
                    }));

                    console.log("📩 Email notifications sent to users.");
                }
            }
        }

        console.log("📢 In-app notifications and email notifications sent to all members.");
    }

    const expiredSessions = await VotingSession.find({ 
        status: "active", 
        endDate: { $lte: now } 
    });

    console.log(`Found ${expiredSessions.length} expired sessions to close.`);
    console.log("Expired Sessions:", expiredSessions);

    if (expiredSessions.length > 0) {
        console.log(`Closing ${expiredSessions.length} expired voting sessions...`);

        await VotingSession.updateMany(
            { _id: { $in: expiredSessions.map(session => session._id) }, status: "active" },
            { $set: { status: "closed" } }
        );

        console.log("✅ Expired voting sessions closed.");

        for (const session of expiredSessions) {
            const { organization } = session;

            const { finalFormattedResult, positionWinners } = await formatVotingResult(session._id);

            await Result.create({
                votingSession: session._id,
                results: finalFormattedResult,
                winners: positionWinners
            });

            if (organization) {
                const usersInOrganization = await User.find({ organizationIds: organization }).select("_id email");
                const userIds = usersInOrganization.map(user => user._id);

                if (userIds.length > 0) {
                    const notifications = userIds.map(userId => ({
                        user: userId,
                        message: `The voting session "${session.title}" has ended. You can now check the results.`,
                        type: "voting_result",
                        isRead: false,
                        metadata: {
                            sessionId: session._id,
                            results: finalFormattedResult,
                            winners: positionWinners
                        }
                    }));

                    await Notification.insertMany(notifications);
                }
                await Promise.all(usersInOrganization.map(user => {
                    return sendEmail({
                        email: user.email,
                        subject: `Voting Results - ${session.title}`,
                        html: `
                            <p>The voting session <strong>${session.title}</strong> has ended.</p>
                            <p><strong>Winners:</strong></p>
                            <ul>
                                ${Object.entries(positionWinners).map(([pos, winner]) => `<li><strong>${pos}</strong>: ${winner.name}</li>`).join("")}
                            </ul>
                        `
                    });
                }));

                console.log("📩 Email notifications sent to users for voting results.");
            }

            console.log(`✅ Results sent for session "${session.title}"`);
        }

        console.log("📢 In-app notifications and email notifications sent to all members.");
    }

    isRunning = false; 
});

cron.schedule("*/5 * * * *", processVotingSessions, { timezone: "Africa/Lagos" });
