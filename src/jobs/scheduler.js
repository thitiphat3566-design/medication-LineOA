const cron = require('node-cron');
const googleSheetsService = require('../services/googleSheetsService');
const lineMessageService = require('../services/lineMessageService');

function initJobs() {
  console.log('Initializing Cron Jobs...');

  // 1. Regular Reminders: 07:00, 11:00, 17:00 every day
  cron.schedule('0 7 * * *', () => sendRoutineReminder('morning'), { timezone: 'Asia/Bangkok' });
  cron.schedule('0 11 * * *', () => sendRoutineReminder('noon'), { timezone: 'Asia/Bangkok' });
  cron.schedule('0 17 * * *', () => sendRoutineReminder('evening'), { timezone: 'Asia/Bangkok' });

  // 2. Repeat Morning Reminders: 07:30, 08:00 every day
  cron.schedule('30 7 * * *', () => sendRepeatReminder('morning'), { timezone: 'Asia/Bangkok' });
  cron.schedule('0 8 * * *', () => sendRepeatReminder('morning'), { timezone: 'Asia/Bangkok' });

  // 3. Repeat Noon Reminders: 11:30, 12:00 every day
  cron.schedule('30 11 * * *', () => sendRepeatReminder('noon'), { timezone: 'Asia/Bangkok' });
  cron.schedule('0 12 * * *', () => sendRepeatReminder('noon'), { timezone: 'Asia/Bangkok' });

  // 4. Repeat Evening Reminders: 17:30, 18:00 every day
  cron.schedule('30 17 * * *', () => sendRepeatReminder('evening'), { timezone: 'Asia/Bangkok' });
  cron.schedule('0 18 * * *', () => sendRepeatReminder('evening'), { timezone: 'Asia/Bangkok' });

  // 3. Symptom Assessment: Every Monday and Thursday at 09:00
  cron.schedule('0 9 * * 1,4', async () => {
    console.log('Running Symptom Assessment Job...');
    try {
      const activeUsers = await googleSheetsService.getActivePatients();
      for (const userId of activeUsers) {
        await lineMessageService.sendSymptomAssessment(userId);
      }
      console.log(`Sent symptom assessment to ${activeUsers.length} users.`);
    } catch (error) {
      console.error('Error in Symptom Assessment Job:', error);
    }
  }, { timezone: 'Asia/Bangkok' });
}

async function sendRoutineReminder(timeRound) {
  console.log(`Running Routine Reminder Job: ${timeRound}`);
  try {
    const activeUsers = await googleSheetsService.getActivePatients();
    for (const userId of activeUsers) {
      await lineMessageService.sendMedicationReminder(userId, timeRound);
    }
    console.log(`Sent routine reminder (${timeRound}) to ${activeUsers.length} users.`);
  } catch (error) {
    console.error(`Error in Routine Reminder Job (${timeRound}):`, error);
  }
}

async function sendRepeatReminder(timeRound) {
  console.log(`Running Repeat Reminder Job: ${timeRound}`);
  try {
    const missedUsers = await googleSheetsService.getUsersWhoMissedMedication(timeRound);
    
    // We also need to check if they are active (within 6 weeks)
    const activeUsers = await googleSheetsService.getActivePatients();
    const targetUsers = missedUsers.filter(id => activeUsers.includes(id));
    
    for (const userId of targetUsers) {
      await lineMessageService.sendMedicationReminder(userId, timeRound);
    }
    console.log(`Sent repeat reminder (${timeRound}) to ${targetUsers.length} users.`);
  } catch (error) {
    console.error(`Error in Repeat Reminder Job (${timeRound}):`, error);
  }
}

module.exports = {
  initJobs
};
