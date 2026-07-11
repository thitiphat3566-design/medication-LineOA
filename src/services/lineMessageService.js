const line = require('@line/bot-sdk');
const env = require('../config/env');

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: env.line.channelAccessToken
});

/**
 * Send Medication Reminder (Flex Message)
 */
async function sendMedicationReminder(userId, timeRound) {
  const message = {
    type: 'flex',
    altText: `แจ้งเตือนทานยารอบ${timeRound}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `ได้เวลาทานยารอบ${timeRound}แล้วครับ 💊`,
            weight: 'bold',
            size: 'md',
            wrap: true
          },
          {
            type: 'text',
            text: 'กรุณากดปุ่มเพื่อบันทึกสถานะการทานยา',
            size: 'sm',
            color: '#aaaaaa',
            wrap: true,
            margin: 'md'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'ทานแล้ว',
              data: `action=med_${timeRound}&status=taken`,
              displayText: 'ทานแล้ว'
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'ยังไม่ทาน',
              data: `action=med_${timeRound}&status=not_taken`,
              displayText: 'ยังไม่ทาน'
            }
          }
        ]
      }
    }
  };

  try {
    await client.pushMessage({
      to: userId,
      messages: [message]
    });
    console.log(`Sent medication reminder to ${userId}`);
  } catch (error) {
    console.error(`Error sending medication reminder to ${userId}:`, error.originalError?.response?.data || error.message);
  }
}

/**
 * Send Symptom Assessment (Flex Message)
 */
async function sendSymptomAssessment(userId) {
  const message = {
    type: 'flex',
    altText: 'แบบประเมินอาการ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'แบบประเมินอาการประจำวัน 🩺',
            weight: 'bold',
            size: 'md',
            wrap: true
          },
          {
            type: 'text',
            text: 'วันนี้คุณมีอาการผิดปกติใดๆ หรือไม่ครับ?',
            size: 'sm',
            color: '#aaaaaa',
            wrap: true,
            margin: 'md'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'ปกติ',
              data: 'action=symptom&status=normal',
              displayText: 'ปกติ'
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            color: '#ff4c4c',
            action: {
              type: 'postback',
              label: 'มีอาการ',
              data: 'action=symptom&status=abnormal',
              displayText: 'มีอาการผิดปกติ'
            }
          }
        ]
      }
    }
  };

  try {
    await client.pushMessage({
      to: userId,
      messages: [message]
    });
    console.log(`Sent symptom assessment to ${userId}`);
  } catch (error) {
    console.error(`Error sending symptom assessment to ${userId}:`, error.originalError?.response?.data || error.message);
  }
}

/**
 * Send simple text message
 */
async function sendTextMessage(userId, text) {
  try {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text }]
    });
  } catch (error) {
    console.error(`Error sending text message to ${userId}:`, error.message);
  }
}

module.exports = {
  sendMedicationReminder,
  sendSymptomAssessment,
  sendTextMessage
};
