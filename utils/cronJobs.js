console.log("Cron job file loaded.");

const cron = require("node-cron");
const sendEmail = require("../utils/sendEmail");
const formatVotingResult = require("./formatVotingResult");
const prisma = require('../src/config/prisma');
const { createAndPushManyNotifications } = require('./notificationService');

let isRunning = false;

const processVotingSessions = async () => {
    if (isRunning) {
        console.log("Cron job already running. Skipping this cycle...");
        return;
    }

    isRunning = true;
    const now = new Date();
    console.log(`[${now.toISOString()}] Checking for voting session updates...`);
    console.log(`Now (Lagos Time):`, now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));

    try {
        const pendingSessions = await prisma.votingSession.findMany({
            where: {
                status: 'pending',
                startDate: { lte: now }
            }
        });

        console.log(`Found ${pendingSessions.length} pending sessions to start.`);

        if (pendingSessions.length > 0) {
            await prisma.votingSession.updateMany({
                where: {
                    id: { in: pendingSessions.map(s => s.id) },
                    status: 'pending'
                },
                data: { status: 'active' }
            });

            console.log("Pending voting sessions started.");

            for (const session of pendingSessions) {
                console.log(`Started session: ${session.title}`);

                const members = await prisma.organizationMember.findMany({
                    where: { organizationId: session.organizationId },
                    include: { user: { select: { id: true, email: true } } }
                });

                if (!members.length) {
                    console.log("No users found. Skipping notifications.");
                    continue;
                }

                console.log(`Found ${members.length} users in organization`);

                await createAndPushManyNotifications(
                    members.map(m => ({
                        userId: m.userId,
                        message: `The voting session "${session.title}" has started. You can now cast your votes!`,
                        type: 'voting_start',
                        isRead: false
                    }))
                );

                console.log("Notifications inserted and pushed.");

                await Promise.all(members.map(m =>
                    sendEmail({
                        email: m.user.email,
                        subject: `Voting has started!`,
                        html: `<p>The voting session <strong>${session.title}</strong> has started. You can now cast your votes!</p>`
                    })
                ));

                console.log("Emails sent for session:", session.title);
            }
        }

        const expiredSessions = await prisma.votingSession.findMany({
            where: {
                status: 'active',
                endDate: { lte: now }
            }
        });

        console.log(`Found ${expiredSessions.length} expired sessions to close.`);

        if (expiredSessions.length > 0) {
            await prisma.votingSession.updateMany({
                where: {
                    id: { in: expiredSessions.map(s => s.id) },
                    status: 'active'
                },
                data: { status: 'closed' }
            });

            console.log("Expired voting sessions closed.");

            for (const session of expiredSessions) {
                const { finalFormattedResult, positionWinners } = await formatVotingResult(session.id);

                await prisma.result.upsert({
                    where: { votingSessionId: session.id },
                    create: {
                        votingSessionId: session.id,
                        results: finalFormattedResult,
                        winners: positionWinners
                    },
                    update: {
                        results: finalFormattedResult,
                        winners: positionWinners
                    }
                });

                const members = await prisma.organizationMember.findMany({
                    where: { organizationId: session.organizationId },
                    include: { user: { select: { id: true, email: true } } }
                });

                if (members.length > 0) {
                    await createAndPushManyNotifications(
                        members.map(m => ({
                            userId: m.userId,
                            message: `The voting session "${session.title}" has ended. You can now check the results.`,
                            type: 'voting_result',
                            isRead: false,
                            metadata: {
                                sessionId: session.id,
                                results: finalFormattedResult,
                                winners: positionWinners
                            }
                        }))
                    );

                    await Promise.all(members.map(m =>
                        sendEmail({
                            email: m.user.email,
                            subject: `Voting Results - ${session.title}`,
                            html: `
                                <p>The voting session <strong>${session.title}</strong> has ended.</p>
                                <p><strong>Winners:</strong></p>
                                <ul>
                                    ${Object.entries(positionWinners)
                                        .map(([pos, winner]) => `<li><strong>${pos}</strong>: ${winner.name}</li>`)
                                        .join("")}
                                </ul>
                            `
                        })
                    ));

                    console.log("Emails and notifications sent for results:", session.title);
                }

                console.log(`Results saved and notifications sent for "${session.title}"`);
            }
        }

    } catch (err) {
        console.error("❌ Cron job error:", err);
    } finally {
        isRunning = false;
    }
};

cron.schedule("*/5 * * * *", processVotingSessions, { timezone: "Africa/Lagos" });