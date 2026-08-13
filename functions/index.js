const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Middleware to verify Firebase Auth token for protected routes
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    
    // Fetch custom claims or user role from Firestore if needed
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if(userDoc.exists) {
        req.user.role = userDoc.data().role;
    }

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// --- PUBLIC ROUTES ---
// e.g., Generate a link for the patient, fetching patient data by token

// --- PROTECTED ROUTES ---
// e.g., Admin creating a new staff member

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if(!userDoc.exists) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        res.json({ user: { id: req.user.uid, email: req.user.email, ...userDoc.data() } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- STAFF MANAGEMENT ROUTES (Admin Only) ---
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    next();
};

app.post('/api/staff', authenticate, requireAdmin, async (req, res) => {
    try {
        const { username, name, role, password } = req.body;
        const email = `${username}@palliative-rph.local`;

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        const userData = {
            username,
            name,
            role,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        res.json({ id: userRecord.uid, ...userData });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/staff/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, password } = req.body;
        
        if (password) {
            await auth.updateUser(id, { password });
        }
        
        if (name || role) {
            const updates = {};
            if (name) updates.name = name;
            if (role) updates.role = role;
            await db.collection('users').doc(id).update(updates);
            if (name) await auth.updateUser(id, { displayName: name });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/staff/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await auth.deleteUser(id);
        await db.collection('users').doc(id).delete();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export the Express API as a Firebase Cloud Function
exports.api = onRequest({ region: "asia-southeast1" }, app);

// --- TELEGRAM ALERT FUNCTION ---
// Send a message when a critical assessment is submitted
exports.onAssessmentCreated = onDocumentCreated({
    document: "assessments/{docId}",
    region: "asia-southeast1"
}, async (event) => {
    const data = event.data.data();
    if (!data) return;

    const { scores, patientId, round } = data;
    if (!scores) return;

    // Check if any score is >= 7
    const isCritical = Object.values(scores).some(score => score >= 7);
    if (!isCritical) return; // Only alert for critical assessments

    try {
        // Fetch patient details
        const patientDoc = await db.collection('patients').doc(patientId).get();
        const patientName = patientDoc.exists ? patientDoc.data().name : 'Unknown Patient';
        const patientHN = patientDoc.exists ? (patientDoc.data().HN || patientId) : patientId;

        // Construct the message
        let message = `🚨 <b>แจ้งเตือนด่วน: อาการวิกฤต</b>\n\n`;
        message += `👤 <b>ผู้ป่วย:</b> ${patientName}\n`;
        message += `🆔 <b>HN:</b> ${patientHN}\n`;
        message += `🕒 <b>รอบประเมิน:</b> ${round}\n\n`;
        message += `<b>ผลประเมินที่วิกฤต (≥ 7):</b>\n`;

        const labels = {
            pain: 'ปวด', shortnessOfBreath: 'เหนื่อยหอบ', tiredness: 'อ่อนเพลีย',
            drowsiness: 'ง่วงซึม', nausea: 'คลื่นไส้', appetite: 'เบื่ออาหาร',
            depression: 'ซึมเศร้า', anxiety: 'วิตกกังวล', wellbeing: 'สุขภาวะ'
        };

        for (const [key, value] of Object.entries(scores)) {
            if (value >= 7) {
                message += `- ${labels[key] || key}: ${value}/10\n`;
            }
        }

        message += `\n<i>กรุณาตรวจสอบระบบและติดต่อผู้ป่วยโดยด่วน</i>`;

        // Configure Telegram
        // Replace with your actual bot token and chat ID, or set them via Firebase Environment Variables
        // firebase functions:secrets:set TELEGRAM_BOT_TOKEN
        // firebase functions:secrets:set TELEGRAM_CHAT_ID
        const botToken = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN'; 
        const chatId = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';

        if (botToken !== 'YOUR_BOT_TOKEN' && chatId !== 'YOUR_CHAT_ID') {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            console.log(`Telegram alert sent for patient ${patientId}`);
        } else {
            console.warn('Telegram credentials not set. Alert not sent.', message);
        }

    } catch (error) {
        console.error('Error sending Telegram alert:', error);
    }
});
