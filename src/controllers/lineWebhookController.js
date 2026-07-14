const lineMessageService = require('../services/lineMessageService');
const googleSheetsService = require('../services/googleSheetsService');

// State management for in-memory conversation state
const userStates = new Map();

async function handleEvent(event) {
  try {
    // 1. Handle Follow Event (User adds Bot)
    if (event.type === 'follow') {
      const userId = event.source.userId;
      console.log(`User followed: ${userId}`);
      
      // Register patient in Google Sheets (Sheet: Patients)
      await googleSheetsService.registerPatient(userId);
      
      // Send welcome message
      await lineMessageService.sendTextMessage(
        userId,
        'สวัสดีครับ ขอบคุณที่เพิ่มเราเป็นเพื่อน ระบบได้ลงทะเบียนคุณเข้าสู่ระบบติดตามการทานยาเรียบร้อยแล้วครับ'
      );
      return;
    }

    // 2. Handle Postback Event (User clicks button in Flex Message)
    if (event.type === 'postback') {
      const userId = event.source.userId;
      const data = event.postback.data;
      
      // Parse postback data (e.g. "action=med_morning&status=taken")
      const params = new URLSearchParams(data);
      const action = params.get('action');
      const status = params.get('status');
      
      if (!action) return;

      if (action.startsWith('med_')) {
        // Handle medication postback
        const timeRound = action.replace('med_', ''); // e.g. "morning"
        await googleSheetsService.logMedication(userId, timeRound, status);
        
        const replyText = status === 'taken' 
          ? `บันทึกข้อมูลเรียบร้อย ขอบคุณที่ทานยารอบ ${timeRound} ตรงเวลาครับ`
          : `บันทึกข้อมูลแล้วครับ รบกวนอย่าลืมทานยาเพื่อสุขภาพที่แข็งแรงนะครับ`;
          
        await lineMessageService.sendTextMessage(userId, replyText);
      } 
      else if (action === 'symptom') {
        // Handle symptom postback
        await googleSheetsService.logSymptom(userId, status);
        
        if (status === 'normal') {
          await lineMessageService.sendTextMessage(userId, 'ยินดีด้วยครับที่คุณมีสุขภาพปกติในวันนี้');
        } else {
          // Set state to wait for symptom detail
          userStates.set(userId, 'WAITING_SYMPTOM_DETAIL');
          await lineMessageService.sendTextMessage(userId, 'คุณมีอาการผิดปกติอย่างไรบ้างครับ? รบกวนพิมพ์อธิบายสั้นๆ ให้พยาบาลทราบครับ');
        }
      }
      return;
    }

    // (Optional) Handle regular text messages
    if (event.type === 'message' && event.message.type === 'text') {
      const userText = event.message.text;
      const userId = event.source.userId;
      
      // Check if user is in WAITING_SYMPTOM_DETAIL state
      if (userStates.get(userId) === 'WAITING_SYMPTOM_DETAIL') {
        await googleSheetsService.updateLastSymptomDetail(userId, userText);
        userStates.delete(userId); // Clear state
        
        await lineMessageService.sendTextMessage(userId, 'ระบบบันทึกรายละเอียดอาการของคุณเรียบร้อยแล้วครับ หากมีอาการรุนแรง แนะนำให้โทร 1669 ทันทีครับ');
        return;
      }
      
      // If user types a keyword related to being sick or reporting symptoms
      if (userText.includes('แจ้งอาการ') || userText.includes('ผิดปกติ') || userText.includes('ป่วย') || userText.includes('ไม่สบาย')) {
        await lineMessageService.sendSymptomAssessment(userId);
      } else {
        // We can optionally remind them how to report symptoms if they type something else
        // await lineMessageService.sendTextMessage(userId, "ระบบตอบกลับอัตโนมัติ: หากคุณมีอาการผิดปกติ สามารถพิมพ์คำว่า 'แจ้งอาการ' ได้ตลอดเวลาครับ");
      }
    }
  } catch (error) {
    console.error('Error handling event:', error);
  }
}

module.exports = {
  handleEvent
};
