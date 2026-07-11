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
    const takenUsers = logs
      .filter(row => row[0] === date && row[1] === timeRound && row[3] === 'taken')
      .map(row => row[2]);

    // Missed = All Users - Taken Users
    const missedUsers = userIds.filter(id => !takenUsers.includes(id));
    
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

module.exports = {
  registerPatient,
  logMedication,
  logSymptom,
  getUsersWhoMissedMedication,
  getActivePatients
};
