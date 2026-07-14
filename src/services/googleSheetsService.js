const { google } = require('googleapis');
const env = require('../config/env');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.google.clientEmail,
    private_key: env.google.privateKey,
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Register a new patient when they add the bot.
 * Sheet Name: Patients
 * Columns: UserID | StartDate | Timestamp
 */
async function registerPatient(userId) {
  try {
    const timestamp = new Date().toISOString();
    const startDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if user already exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Patients!A:C',
    });

    const rows = response.data.values || [];
    const userExists = rows.some(row => row[0] === userId);

    if (userExists) {
      console.log(`User ${userId} already registered.`);
      return;
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Patients!A:C',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[userId, startDate, timestamp]],
      },
    });
    console.log(`Registered new patient: ${userId}`);
  } catch (error) {
    console.error('Error registering patient:', error);
  }
}

/**
 * Log medication taken/not taken
 * Sheet Name: Medications
 * Columns: Date | Time_Round | UserID | Status | Timestamp
 */
async function logMedication(userId, timeRound, status) {
  try {
    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Medications!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[date, timeRound, userId, status, timestamp]],
      },
    });
    console.log(`Logged medication for ${userId}: ${timeRound} - ${status}`);
  } catch (error) {
    console.error('Error logging medication:', error);
  }
}

/**
 * Log symptom status
 * Sheet Name: Symptoms
 * Columns: Date | UserID | Symptom_Status | Timestamp
 */
async function logSymptom(userId, symptomStatus) {
  try {
    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Symptoms!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[date, userId, symptomStatus, timestamp]],
      },
    });
    console.log(`Logged symptom for ${userId}: ${symptomStatus}`);
  } catch (error) {
    console.error('Error logging symptom:', error);
  }
}

/**
 * Update the last logged symptom detail for a user today
 */
async function updateLastSymptomDetail(userId, detail) {
  try {
    const date = new Date().toISOString().split('T')[0];
    
    // First, find the row index
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Symptoms!A:E',
    });
    
    const rows = res.data.values || [];
    let targetRowIndex = -1;
    
    // Search backwards to find the latest row for this user today with 'abnormal' status
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][0] === date && rows[i][1] === userId && rows[i][2] === 'abnormal') {
        targetRowIndex = i + 1; // Google Sheets is 1-indexed
        break;
      }
    }

    if (targetRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.google.spreadsheetId,
        range: `Symptoms!E${targetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[detail]],
        },
      });
      console.log(`Updated symptom detail for ${userId} at row ${targetRowIndex}`);
    } else {
      console.log(`Could not find an abnormal symptom log today for ${userId} to update.`);
    }
  } catch (error) {
    console.error('Error updating symptom detail:', error);
  }
}

/**
 * Get users who haven't taken medication for a specific round today.
 */
async function getUsersWhoMissedMedication(timeRound) {
  try {
    const date = new Date().toISOString().split('T')[0];
    
    // Get all patients
    const patientsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Patients!A:B',
    });
    
    const patients = patientsRes.data.values || [];
    // Skip header row if exists, assume it's UserID | StartDate
    const userIds = patients.slice(1).map(row => row[0]).filter(id => id);

    // Get medication logs
    const medsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Medications!A:E',
    });

    const logs = medsRes.data.values || [];
    
    // Find users who have a log for today and the specific time round
    // We consider them as "replied" if they pressed either "taken" or "not_taken"
    const repliedUsers = logs
      .filter(row => row[0] === date && row[1] === timeRound && (row[3] === 'taken' || row[3] === 'not_taken'))
      .map(row => row[2]);

    // Missed = All Users - Replied Users
    const missedUsers = userIds.filter(id => !repliedUsers.includes(id));
    
    return missedUsers;
  } catch (error) {
    console.error('Error getting missed medications:', error);
    return [];
  }
}

/**
 * Get active patients (within 6 weeks)
 */
async function getActivePatients() {
  try {
    const patientsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Patients!A:B',
    });
    
    const patients = patientsRes.data.values || [];
    if (patients.length <= 1) return []; // Only header or empty
    
    const activeUsers = [];
    const now = new Date();
    
    for (let i = 1; i < patients.length; i++) {
      const userId = patients[i][0];
      const startDateStr = patients[i][1];
      
      if (!userId || !startDateStr) continue;
      
      const startDate = new Date(startDateStr);
      const diffTime = Math.abs(now - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 6 weeks = 42 days
      if (diffDays <= 42) {
        activeUsers.push(userId);
      }
    }
    
    return activeUsers;
  } catch (error) {
    console.error('Error getting active patients:', error);
    return [];
  }
}

/**
 * Get dashboard stats
 */
async function getDashboardStats() {
  try {
    const activeUsers = await getActivePatients();
    const totalPatients = activeUsers.length;
    
    const date = new Date().toISOString().split('T')[0];
    
    const medsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Medications!A:E',
    });
    const logs = medsRes.data.values || [];
    
    const takenToday = new Set(
      logs
        .filter(row => row[0] === date && row[3] === 'taken' && activeUsers.includes(row[2]))
        .map(row => row[2])
    );
    
    return {
      totalActivePatients: totalPatients,
      patientsTakenMedsToday: takenToday.size,
      patientsMissedMedsToday: totalPatients - takenToday.size
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { totalActivePatients: 0, patientsTakenMedsToday: 0, patientsMissedMedsToday: 0 };
  }
}

/**
 * Get alerts for dashboard
 */
async function getAlerts() {
  try {
    const activeUsers = await getActivePatients();
    const date = new Date().toISOString().split('T')[0];
    
    const sympRes = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Symptoms!A:E',
    });
    const symptoms = sympRes.data.values || [];
    
    // 1. Abnormal Symptoms Today
    const abnormalLogs = symptoms.filter(row => row[0] === date && row[2] === 'abnormal' && activeUsers.includes(row[1]));
    const abnormalAlerts = abnormalLogs.map(row => ({
      userId: row[1],
      type: 'abnormal_symptom',
      time: row[3],
      detail: row[4] || '' // Column E
    }));
      
    const medsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: env.google.spreadsheetId,
      range: 'Medications!A:E',
    });
    const medsLogs = medsRes.data.values || [];
    
    const takenToday = new Set(
      medsLogs
        .filter(row => row[0] === date && row[3] === 'taken' && activeUsers.includes(row[2]))
        .map(row => row[2])
    );
    
    const missedTodayLogs = activeUsers
      .filter(id => !takenToday.has(id))
      .map(id => ({ userId: id, type: 'missed_medication', time: new Date().toISOString() }));
      
    return [...abnormalLogs, ...missedTodayLogs];
  } catch (error) {
    console.error('Error getting alerts:', error);
    return [];
  }
}

module.exports = {
  registerPatient,
  logMedication,
  logSymptom,
  getUsersWhoMissedMedication,
  getActivePatients,
  getDashboardStats,
  getAlerts,
  updateLastSymptomDetail
};
