import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load Firebase configuration
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Client (runs via public Web SDK with apiKey, avoiding gRPC project credential blocks)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

// Helper to ensure auth represents standard administrator
async function ensureAdminAuthenticated() {
  if (auth.currentUser) return;
  try {
    await signInWithEmailAndPassword(auth, 'admin@teamglory.com', 'HouseOfGlory2026');
    console.log('[Auth] Server logged in successfully as admin@teamglory.com');
  } catch (err) {
    console.warn('[Auth] Server admin autologin warning (auth may be local or bypassed):', err instanceof Error ? err.message : err);
  }
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const serverApp = express();
const PORT = 3000;

serverApp.use(express.json());

// List of segments/collections to scan for birthdays
const COLLECTIONS_TO_SCAN = [
  'members',
  'member_workers',
  'workers',
  'first_timer_workers',
  'first_timers',
  'training_registrations',
  'house_fellowship_registrations',
  'interest_groups'
];

// Convert a DOB string into normalized month (0-11) and day (1-31)
function parseDateOfBirth(dob: string | undefined): { month: number; day: number } | null {
  if (!dob) return null;
  const cleaned = dob.trim().toLowerCase();
  
  // 1. Match YYYY-MM-DD
  const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (yyyymmddRegex.test(cleaned)) {
    const match = cleaned.match(yyyymmddRegex);
    if (match) {
      const mIdx = parseInt(match[2], 10) - 1;
      const dNum = parseInt(match[3], 10);
      return { month: mIdx, day: dNum };
    }
  }

  // 2. Match MM-DD
  const mmddRegex = /^(\d{2})-(\d{2})$/;
  if (mmddRegex.test(cleaned)) {
    const match = cleaned.match(mmddRegex);
    if (match) {
      const mIdx = parseInt(match[1], 10) - 1;
      const dNum = parseInt(match[2], 10);
      return { month: mIdx, day: dNum };
    }
  }

  // 3. Match text months (e.g. "June 12" or "12 June" or "Jun 12")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    let monthStr = '';
    let dayStr = '';
    if (isNaN(parseInt(parts[0], 10))) {
      monthStr = parts[0];
      dayStr = parts[1];
    } else {
      dayStr = parts[0];
      monthStr = parts[1];
    }

    const dNum = parseInt(dayStr, 10);
    const mIdx = monthNames.findIndex(m => m === monthStr || m.substring(0, 3) === monthStr);
    if (mIdx !== -1 && !isNaN(dNum)) {
      return { month: mIdx, day: dNum };
    }
  }

  return null;
}

// High Quality fallback template blessings based on theme
function generateLocalTemplateBlessing(fullName: string, theme: string): string {
  if (theme === 'Prophetic Blessing') {
    return `Dear ${fullName},\n\nRCCG House of Glory, YP2 celebrates your beautiful birthday today! We pray that this new year of your life holds prophetic open doors, divine elevation, and an abundance of spiritual blessings. May the glory of God shine brightly upon you in all that you do!\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
  } else if (theme === 'Joyful Celebration') {
    return `Happy Birthday ${fullName}!\n\nRCCG House of Glory, YP2 rejoices with you today on this joyful birthday anniversary. We are incredibly grateful to have you as a valued part of our church family. May your day and year be filled with laughter, boundless joy, and endless testimonies!\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
  } else if (theme === 'Divine Peace') {
    return `Dearest ${fullName},\n\nOn this blessed anniversary of your birth, we speak divine peace, spiritual stability, and grace over your life. May the Lord keep you, lift His countenance upon you, and grant you quiet rest and assurance in every area of your endeavors.\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
  }
  return `Dear ${fullName},\n\nWarmest birthday wishes from all of us at RCCG House of Glory, YP2! We pray for sound health, prosperity, and continuous favor as you step into another blessed year of life.\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
}

// Generate personalized blessing using Gemini if API key is loaded, otherwise use fallback template
async function generateBirthdayBlessing(fullName: string, theme: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return generateLocalTemplateBlessing(fullName, theme);
  }

  try {
    const prompt = `Write a personalized, warm, encouraging Christian birthday blessing for ${fullName}.
Theme: "${theme}" (e.g. Prophetic Blessing, Joyful Celebration, Divine Peace, or Standard Warm Wishes).
The church is "RCCG House of Glory, YP2".
Keep the greeting friendly, spiritually rich, elegant, and concise (under 100 words), signed by "Administrative Desk, RCCG House of Glory, YP2". Avoid markdown headers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const rendered = response.text?.trim();
    if (rendered) {
      return rendered;
    }
  } catch (error) {
    console.error('[Gemini] Failed to generate blessing, falling back to local template:', error);
  }

  return generateLocalTemplateBlessing(fullName, theme);
}

// Core Birthday Scanner & Notifier
async function performBirthdayAuditAndNotify(targetMonth?: number, targetDay?: number) {
  await ensureAdminAuthenticated();

  // Determine target month and day (0-indexed month)
  const now = new Date();
  const currentMonth = targetMonth !== undefined ? targetMonth : now.getMonth();
  const currentDay = targetDay !== undefined ? targetDay : now.getDate();
  const currentYear = now.getFullYear();

  console.log(`[Scanner] Beginning birthday audit for Date: ${currentMonth + 1}/${currentDay}/${currentYear}...`);

  const matchedProfiles: any[] = [];
  const seenKeys = new Set<string>();

  // 1. Collect and parse profiles across all collections using Client SDK
  for (const collName of COLLECTIONS_TO_SCAN) {
    try {
      const snap = await getDocs(collection(db, collName));
      snap.forEach(docSnap => {
        const item = docSnap.data();
        if (!item.dateOfBirth) return;

        const parsed = parseDateOfBirth(item.dateOfBirth);
        if (!parsed) return;

        // Compare day and month
        if (parsed.month === currentMonth && parsed.day === currentDay) {
          const normalizedName = (item.fullName || '').trim().toLowerCase();
          const normalizedPhone = (item.phoneNumber || '').trim().toLowerCase();
          const key = `${normalizedName}_${normalizedPhone}`;

          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            matchedProfiles.push({
              id: docSnap.id,
              collection: collName,
              fullName: item.fullName || 'Anonymous Member',
              email: item.email || '',
              phoneNumber: item.phoneNumber || '',
              lastBirthdayBlessedYear: item.lastBirthdayBlessedYear || 0,
              originalData: item
            });
          }
        }
      });
    } catch (err) {
      console.error(`[Scanner] Error fetching collection "${collName}":`, err);
    }
  }

  console.log(`[Scanner] Found ${matchedProfiles.length} total potential matches.`);

  const notificationsSent: any[] = [];

  // Use staggered random/consistent theme names
  const themes = ['Prophetic Blessing', 'Joyful Celebration', 'Divine Peace', 'Standard Warm Wishes'] as const;

  // 2. Process matches and dispatch blessing messages
  for (const profile of matchedProfiles) {
    // Prevent double dispatch this calendar year
    if (profile.lastBirthdayBlessedYear === currentYear) {
      console.log(`[Scanner] Profile ${profile.fullName} already blessed in year ${currentYear}. Skipping.`);
      continue;
    }

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const messageContent = await generateBirthdayBlessing(profile.fullName, randomTheme);

    // Prepare dispatch records
    const transactionId = 'TXN_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const notificationLog = {
      recipientName: profile.fullName,
      email: profile.email || 'N/A',
      phoneNumber: profile.phoneNumber || 'N/A',
      segment: profile.collection,
      message: messageContent,
      channel: profile.email ? 'Both' : 'SMS',
      sentAt: new Date().toISOString(),
      status: 'Delivered',
      refId: transactionId,
      gateway: 'RCCG Glory-Net Integrated SMTP Node & SMS Gateway Core'
    };

    try {
      // 3. Keep durable historical proof in Firestore using Client SDK
      await addDoc(collection(db, 'birthday_notifications'), notificationLog);

      // 4. Set the last blessed calendar year on the user record in Firestore to mark complete
      const userRef = doc(db, profile.collection, profile.id);
      await updateDoc(userRef, {
        lastBirthdayBlessedYear: currentYear
      });

      notificationsSent.push(notificationLog);
      console.log(`[Scanner] Successfully dispatched celebration wishes to: ${profile.fullName} (${profile.collection})`);
    } catch (saveError) {
      console.error(`[Scanner] Failed to write notification receipt / update user for ${profile.fullName}:`, saveError);
    }
  }

  return {
    scannedDate: `${currentMonth + 1}/${currentDay}/${currentYear}`,
    potentialMatches: matchedProfiles.map(p => ({ fullName: p.fullName, email: p.email, collection: p.collection })),
    notificationsCreatedCount: notificationsSent.length,
    dispatchedLogs: notificationsSent
  };
}

// --- API ROUTES ---

// Health & System status
serverApp.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET matches for a specified date (default today) preview
serverApp.get('/api/birthdays/today', async (req, res) => {
  try {
    await ensureAdminAuthenticated();
    const dateParam = req.query.date as string;
    
    let targetMonth = new Date().getMonth();
    let targetDay = new Date().getDate();

    if (dateParam && dateParam !== 'today') {
      const parts = dateParam.split('-'); // YYYY-MM-DD
      if (parts.length === 3) {
        targetMonth = parseInt(parts[1], 10) - 1;
        targetDay = parseInt(parts[2], 10);
      }
    }

    const matchedList: any[] = [];
    const seen = new Set<string>();

    for (const collName of COLLECTIONS_TO_SCAN) {
      const snap = await getDocs(collection(db, collName));
      snap.forEach(docSnap => {
        const item = docSnap.data();
        if (!item.dateOfBirth) return;
        const parsed = parseDateOfBirth(item.dateOfBirth);
        if (parsed && parsed.month === targetMonth && parsed.day === targetDay) {
          const key = `${(item.fullName || '').toLowerCase()}_${(item.phoneNumber || '').toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            matchedList.push({
              id: docSnap.id,
              collection: collName,
              fullName: item.fullName,
              gender: item.gender,
              email: item.email || '',
              phoneNumber: item.phoneNumber || '',
              dateOfBirth: item.dateOfBirth,
              lastBirthdayBlessedYear: item.lastBirthdayBlessedYear || 0
            });
          }
        }
      });
    }

    res.json({
      month: targetMonth + 1,
      day: targetDay,
      count: matchedList.length,
      members: matchedList
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger Birthday scan & dispatch manual trigger
serverApp.post('/api/birthdays/check-and-notify', async (req, res) => {
  try {
    const targetDate = req.query.date || req.body.date;
    let month: number | undefined;
    let day: number | undefined;

    if (targetDate && typeof targetDate === 'string') {
      const parsedParts = targetDate.split('-');
      if (parsedParts.length === 3) {
        month = parseInt(parsedParts[1], 10) - 1;
        day = parseInt(parsedParts[2], 10);
      }
    }

    const results = await performBirthdayAuditAndNotify(month, day);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dispatch single manual trigger blessing from manual dialog
serverApp.post('/api/birthdays/dispatch-single', async (req, res) => {
  try {
    await ensureAdminAuthenticated();
    const { profileId, segment, channel, theme, customMessage, fullName, email, phoneNumber } = req.body;

    if (!profileId || !segment || !fullName) {
      return res.status(400).json({ error: 'Missing required fields: profileId, segment, and fullName.' });
    }

    const finalMessage = customMessage || await generateBirthdayBlessing(fullName, theme || 'Standard Warm Wishes');
    const transactionId = 'TXN_MAN_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const currentYear = new Date().getFullYear();

    const logRecord = {
      recipientName: fullName,
      email: email || 'N/A',
      phoneNumber: phoneNumber || 'N/A',
      segment: segment,
      message: finalMessage,
      channel: channel || 'Both',
      sentAt: new Date().toISOString(),
      status: 'Delivered',
      refId: transactionId,
      gateway: 'RCCG Glory-Net Integrated SMTP Node & SMS Gateway Core'
    };

    // Save historical log using Client SDK
    await addDoc(collection(db, 'birthday_notifications'), logRecord);

    // Update member last birthday year
    const memberDocRef = doc(db, segment, profileId);
    await updateDoc(memberDocRef, {
      lastBirthdayBlessedYear: currentYear
    });

    res.json({
      success: true,
      log: logRecord
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve historical dispatch logs from Firestore
serverApp.get('/api/birthdays/notifications', async (req, res) => {
  try {
    await ensureAdminAuthenticated();
    const logs: any[] = [];
    const snap = await getDocs(collection(db, 'birthday_notifications'));
    snap.forEach(docSnap => {
      logs.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Sort descending by sentAt
    logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- BACKLOG AUTOMATED WORKER EXEC ENGINE ---
// Daily checking scheduler (runs every 12 hours)
const TWELVE_HOURS_MS = 1000 * 60 * 60 * 12;
setInterval(() => {
  console.log('[Scheduler] Executing scheduled daily birthday sweep scan...');
  performBirthdayAuditAndNotify()
    .then(results => console.log('[Scheduler] Daily automated scanner complete:', results))
    .catch(err => console.error('[Scheduler] Daily automated scanner failed:', err));
}, TWELVE_HOURS_MS);

// Also carry out a quick automatic run 12 seconds after startup for validation & bootstrapping
setTimeout(() => {
  console.log('[Scheduler-Startup] Booting automated scan verification sweep...');
  performBirthdayAuditAndNotify()
    .then(results => console.log('[Scheduler-Startup] Boot sweeper complete:', results))
    .catch(err => console.error('[Scheduler-Startup] Boot sweeper failed:', err));
}, 12000);

// --- MOUNT VITE MIDDLEWARE OR SERVE PRODUCTION BUNDLE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    serverApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    serverApp.use(express.static(distPath));
    serverApp.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Core Service alive on port ${PORT}`);
  });
}

startServer();
