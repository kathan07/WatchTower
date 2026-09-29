import {
    Status,
    AlertType,
    AlertStatus,
    getRecentLogs,
    createAlert,
    getActiveMonitorsWithWebsitesAndUsers,
} from '@repo/prisma';
import {
    redisClient,
    ALERT_COOLDOWN_KEY_PREFIX,
    ALERT_COOLDOWN_PERIOD,
} from '@repo/redis';
import nodemailer from 'nodemailer';
import { subMinutes, formatDistanceToNow } from 'date-fns';

// BUSINESS: Alert when ≥80% of recent samples are DOWN/DEGRADED over a 15m window.
const ALERT_WINDOW_MINUTES = 15;
const MIN_LOG_SAMPLES = 10;
const PROBLEMATIC_PERCENT_THRESHOLD = 80;

export function createEmailTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

async function isAlertCooldownActive(userId: string, websiteId: string): Promise<boolean> {
    const cooldownKey = `${ALERT_COOLDOWN_KEY_PREFIX}:${userId}:${websiteId}`;
    const cooldown = await redisClient.get(cooldownKey);
    return Boolean(cooldown);
}

async function setAlertCooldown(userId: string, websiteId: string): Promise<void> {
    const cooldownKey = `${ALERT_COOLDOWN_KEY_PREFIX}:${userId}:${websiteId}`;
    await redisClient.setex(cooldownKey, ALERT_COOLDOWN_PERIOD, '1');
}

async function sendAlertEmail(
    transporter: nodemailer.Transporter,
    userEmail: string,
    websiteUrl: string,
    status: Status,
    logsCount: number,
    duration: string
): Promise<void> {
    const subject = `Website Alert: ${websiteUrl} is ${status}`;
    const body = `
      Your monitored website ${websiteUrl} has been experiencing issues.

      Status: ${status}
      Duration: ${duration}
      Number of problematic logs: ${logsCount}

      Our monitoring system has detected consistent ${status} status
      for your website over the past ${duration}.

      Please check your website's status and take necessary action.

      Note: You won't receive another alert for this website for the next 30 minutes
      to prevent alert fatigue.
    `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: userEmail,
        subject,
        text: body,
    });
}

/**
 * Scans active monitors and emails users when sustained outage/degradation thresholds are met.
 */
export async function checkAlertConditions(
    transporter: nodemailer.Transporter,
    isShuttingDown: () => boolean
): Promise<void> {
    if (isShuttingDown()) return;

    try {
        const activeMonitors = await getActiveMonitorsWithWebsitesAndUsers();
        const windowStart = subMinutes(new Date(), ALERT_WINDOW_MINUTES);

        await Promise.all(
            activeMonitors.flatMap((monitor) =>
                monitor.websites.map(async (website) => {
                    try {
                        const recentLogs = await getRecentLogs(website.id, windowStart);
                        if (recentLogs.length < MIN_LOG_SAMPLES) {
                            console.log(
                                `There are very few logs found in the last ${ALERT_WINDOW_MINUTES} minutes for website ${website.url}`
                            );
                            return;
                        }

                        const problematicLogs = recentLogs.filter(
                            (log) =>
                                log.status === Status.DOWN || log.status === Status.DEGRADED
                        );
                        const problematicPercentage =
                            (problematicLogs.length / recentLogs.length) * 100;

                        if (problematicPercentage < PROBLEMATIC_PERCENT_THRESHOLD) {
                            return;
                        }

                        const cooldownActive = await isAlertCooldownActive(
                            monitor.userId,
                            website.id
                        );
                        if (cooldownActive) return;

                        const downCount = problematicLogs.filter(
                            (log) => log.status === Status.DOWN
                        ).length;
                        const degradedCount = problematicLogs.filter(
                            (log) => log.status === Status.DEGRADED
                        ).length;
                        const predominantStatus =
                            downCount > degradedCount ? Status.DOWN : Status.DEGRADED;

                        const oldestLogTime = recentLogs[recentLogs.length - 1]!.timestamp;
                        const duration = formatDistanceToNow(oldestLogTime);
                        const message = `Website ${website.url} has been ${predominantStatus} for ${duration}`;
                        const alertType =
                            predominantStatus === Status.DOWN
                                ? AlertType.DOWNTIME
                                : AlertType.PERFORMANCE;

                        await sendAlertEmail(
                            transporter,
                            monitor.user.email,
                            website.url,
                            predominantStatus,
                            problematicLogs.length,
                            duration
                        );

                        await createAlert(website.id, alertType, AlertStatus.SENT, message);
                        await setAlertCooldown(monitor.userId, website.id);

                        console.log(
                            `Alert sent for website ${website.url} to user ${monitor.user.email}`,
                            `(${problematicLogs.length} problematic logs over ${duration})`
                        );
                    } catch (error) {
                        console.error(`Error processing alerts for website ${website.id}:`, error);
                    }
                })
            )
        );
    } catch (error) {
        console.error('Error checking alert conditions:', error);
    }
}
