/**
 * Telegram Notification Service
 * Uses Vite env vars: VITE_TELEGRAM_BOT_TOKEN, VITE_TELEGRAM_CHAT_ID
 * Bot Token and Chat ID are stored as Vercel environment variables (not in git)
 */

const BOT_TOKEN = "8805694470:AAEPuBRl6m1jiK7VoWjJ8WccmDrhjn78PTU";
const CHAT_ID   = "-5398496798";

/**
 * Send a Telegram message to the configured group/channel
 * @param {string} message - HTML-formatted text message
 */
export const sendTelegramMessage = async (message) => {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram not configured (missing env vars)');
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.warn('Telegram send failed:', e);
  }
};

/**
 * Notify when ESAS assessment is submitted
 */
export const notifyAssessmentSubmitted = async ({ patientName, patientId, scores, isCritical }) => {
  const maxScore = Math.max(...Object.values(scores));
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const emoji = isCritical ? '🚨' : '✅';
  const header = isCritical ? 'คะแนนวิกฤต! กรุณาตรวจสอบด่วน 🆘' : 'มีการส่งแบบประเมินใหม่';

  const msg =
    `${emoji} <b>${header}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ผู้ป่วย: <b>${patientName}</b>\n` +
    `🏥 HN: <code>${patientId}</code>\n` +
    `📊 คะแนนรวม: <b>${totalScore}/90</b>  |  คะแนนสูงสุด: <b>${maxScore}/10</b>\n` +
    (isCritical ? `⚠️ <b>มีอาการคะแนน ≥ 7 — กรุณาติดตามด่วน!</b>\n` : '') +
    `🕐 ${new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏨 รพ.พล Palliative Care System`;

  await sendTelegramMessage(msg);
};

/**
 * Notify equipment borrow / return
 */
export const notifyEquipmentAction = async ({ type, equipmentName, patientName, staffName }) => {
  const emoji = type === 'ยืม' ? '📦' : '↩️';
  const msg =
    `${emoji} <b>เครื่องมือแพทย์: ${type}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔧 รายการ: <b>${equipmentName}</b>\n` +
    `👤 ผู้ป่วย: <b>${patientName}</b>\n` +
    `👩‍⚕️ เจ้าหน้าที่: ${staffName}\n` +
    `🕐 ${new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏨 รพ.พล Palliative Care System`;

  await sendTelegramMessage(msg);
};
