import { Status, AlertType, AlertStatus, disconnectDb, connectDb, getRecentLogs, createAlert, getActiveMonitorsWithWebsitesAndUsers } from '@repo/prisma';
import { CronJob } from 'cron';
import {
  redisClient,
  ALERT_COOLDOWN_KEY_PREFIX,
  ALERT_COOLDOWN_PERIOD
} from '@repo/redis';
import nodemailer from 'nodemailer';
import { subMinutes, formatDistanceToNow } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

// interface AlertCondition {
//   websiteId: string;
//   url: string;
//   userId: string;
//   userEmail: string;
//   status: Status;
//   logsCount: number;
//   duration: string;
// }

class AlertingService {
  private alertCheckJob: CronJob;
  private emailTransporter: nodemailer.Transporter;
  private isShuttingDown = false;

  constructor() {
    // Check for alert conditions every minute
    this.alertCheckJob = new CronJob('*/1 * * * *', () => this.checkAlertConditions());

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  private async isAlertCooldownActive(userId: string, websiteId: string): Promise<boolean> {
    const cooldownKey = `${ALERT_COOLDOWN_KEY_PREFIX}:${userId}:${websiteId}`;
    const cooldown = await redisClient.get(cooldownKey);
    return Boolean(cooldown);
  }

  private async setAlertCooldown(userId: string, websiteId: string): Promise<void> {
    const cooldownKey = `${ALERT_COOLDOWN_KEY_PREFIX}:${userId}:${websiteId}`;
    await redisClient.setex(cooldownKey, ALERT_COOLDOWN_PERIOD, '1');
  }

  private async sendAlertEmail(
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

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM,
      to: userEmail,
      subject,
      text: body
    });
  }

  private async checkAlertConditions(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      // Get all active monitors with their websites and users
      const activeMonitors = await getActiveMonitorsWithWebsitesAndUsers();
      const fifteenMinutesAgo = subMinutes(new Date(), 15);

      await Promise.all(
        activeMonitors.flatMap(monitor =>
          monitor.websites.map(async (website) => {
            try {
              // Get all logs from the last 15 minutes
              const recentLogs = await getRecentLogs(website.id, fifteenMinutesAgo);
              // Skip if no logs found
              if (recentLogs.length === 0 || recentLogs.length < 10) {
                console.log(`There are very few logs found in the last 15 minutes for website ${website.url}`);
                return;
              }

              // Calculate the percentage of problematic logs
              const problematicLogs = recentLogs.filter(
                log => log.status === Status.DOWN || log.status === Status.DEGRADED
              );

              const problematicPercentage = (problematicLogs.length / recentLogs.length) * 100;

              // Alert if more than 80% of logs in the last 15 minutes are problematic
              if (problematicPercentage >= 80) {
                // Check cooldown period
                const cooldownActive = await this.isAlertCooldownActive(
                  monitor.userId,
                  website.id
                );

                if (!cooldownActive) {
                  // Determine predominant status
                  const downCount = problematicLogs.filter(log => log.status === Status.DOWN).length;
                  const degradedCount = problematicLogs.filter(log => log.status === Status.DEGRADED).length;
                  const predominantStatus = downCount > degradedCount ? Status.DOWN : Status.DEGRADED;

                  // Calculate duration
                  const oldestLogTime = recentLogs[recentLogs.length - 1].timestamp;
                  const duration = formatDistanceToNow(oldestLogTime);

                  const message: string = `Website ${website.url} has been ${predominantStatus} for ${duration}`
                  // Create alert record
                  const alertType: AlertType = predominantStatus===Status.DOWN? AlertType.DOWNTIME:AlertType.PERFORMANCE;
                  
                  // Send email
                  await this.sendAlertEmail(
                    monitor.user.email,
                    website.url,
                    predominantStatus,
                    problematicLogs.length,
                    duration
                  );

                  await createAlert(website.id, alertType, AlertStatus.SENT, message);
                  // Set cooldown
                  await this.setAlertCooldown(monitor.userId, website.id);

                  console.log(
                    `Alert sent for website ${website.url} to user ${monitor.user.email}`,
                    `(${problematicLogs.length} problematic logs over ${duration})`
                  );
                }
              }
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

  public async start(): Promise<void> {
    try {
      // Verify connections
      await redisClient.ping();
      console.log('Redis connection established');

      await connectDb();
      console.log('Database connection established');

      // Verify email configuration
      await this.emailTransporter.verify();
      console.log('Email transport verified');

      // Start cron job
      this.alertCheckJob.start();
      console.log('Alerting service started');

      // Setup graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('Failed to start alerting service:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    console.log('Shutting down alerting service...');

    this.alertCheckJob.stop();

    try {
      await disconnectDb();
      await redisClient.quit();
      this.emailTransporter.close();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Start the service
const alertingService = new AlertingService();
alertingService.start().catch((error) => {
  console.error('Failed to start alerting service:', error);
  process.exit(1);
});