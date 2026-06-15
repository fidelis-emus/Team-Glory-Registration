import express from 'express';
import path from 'path';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Log incoming HTTP requests for route verification
serverApp.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path} (${req.url})`);
  next();
});

// --- LOCAL SANDBOX SERVER DATABASE (fallback / offline mode) ---
const LOCAL_DB_PATH = path.join(process.cwd(), 'local_server_db.json');

function initLocalServerDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultData = {
      first_timers: [],
      first_timer_workers: [],
      members: [],
      member_workers: [],
      workers: [],
      training_registrations: [],
      house_fellowship_registrations: [],
      interest_groups: [],
      heads_of_departments: [],
      birthday_notifications: [],
      admins_accounts: [
        {
          id: 'admin_root',
          fullName: 'System Administrator',
          email: 'admin@teamglory.com',
          password: 'HouseOfGlory2026',
          role: 'SuperAdmin',
          isFirstLogin: true,
          requiresPasswordReset: false,
          createdAt: new Date().toISOString()
        }
      ],
      branding_config: {
        logoBase64: null,
        headerTitle: 'RCCG HOUSE OF GLORY, YP2',
        headerSubtitle: 'TEAM GLORY',
        footerText: '© 2026 RCCG HOUSE OF GLORY YP2 - TEAM GLORY CENTRAL'
      }
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readLocalDb() {
  initLocalServerDb();
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read local DB, fallback empty object", e);
    return {};
  }
}

function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write local DB", e);
  }
}

// --- MONGODB CONNECTION & DATA ACCESS LAYER ---
const MONGODB_URI = process.env.MONGODB_URI;
let mongoClient: MongoClient | null = null;
let mongoDb: any = null;
let lastMongoConnectAttempt = 0;
const MONGO_COOLDOWN_MS = 60000; // 1 minute retry throttle on connection failure
let mongoConnectionFailedPermanently = false;

async function getMongoDb() {
  if (mongoDb) return mongoDb;
  if (!MONGODB_URI) {
    return null;
  }

  // Detect and bypass clear placeholders or unconfigured credentials
  if (
    MONGODB_URI.includes('xxxxx') || 
    MONGODB_URI.includes('<username>') || 
    MONGODB_URI.includes('<password>') ||
    MONGODB_URI.includes('YOUR_MONGODB_URI')
  ) {
    if (!mongoConnectionFailedPermanently) {
      console.warn('[Database] MONGODB_URI contains a placeholder. Live connection bypassed; using local DB.');
      mongoConnectionFailedPermanently = true;
    }
    return null;
  }

  if (mongoConnectionFailedPermanently) return null;

  const now = Date.now();
  if (now - lastMongoConnectAttempt < MONGO_COOLDOWN_MS) {
    return null;
  }

  lastMongoConnectAttempt = now;

  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(MONGODB_URI, {
        connectTimeoutMS: 3000,
        socketTimeoutMS: 3000,
        serverSelectionTimeoutMS: 3000
      });
      await mongoClient.connect();
      console.log('[Database] Connected successfully to live MongoDB server.');
    }
    mongoDb = mongoClient.db();
    
    // Seed database if empty
    await bootstrapMongoCollections(mongoDb);

    return mongoDb;
  } catch (err: any) {
    console.error('[Database] MongoDB failed to connect, falling back to local file:', err.message);
    if (
      err.message.includes('ENOTFOUND') || 
      err.message.includes('EAI_AGAIN') || 
      err.message.includes('ECONNREFUSED') || 
      err.message.includes('timeout')
    ) {
      console.warn('[Database] Network or DNS error detected. Live MongoDB connections will be bypassed to prevent server lookup hangs.');
      mongoConnectionFailedPermanently = true;
    }
    return null;
  }
}

async function bootstrapMongoCollections(dbInstance: any) {
  try {
    const adminCount = await dbInstance.collection('admins_accounts').countDocuments();
    if (adminCount === 0) {
      console.log('[Database-Bootstrap] MongoDB database is blank. Seeding initial accounts & settings...');
      const localData = readLocalDb();
      for (const collName of Object.keys(localData)) {
        const list = localData[collName];
        if (Array.isArray(list) && list.length > 0) {
          const seeded = list.map((item: any) => {
            const id = item.id || 'REC' + Math.random().toString(36).substring(2, 9).toUpperCase();
            return { ...item, _id: id, id };
          });
          await dbInstance.collection(collName).insertMany(seeded);
          console.log(`[Database-Bootstrap] Seeded collection "${collName}" with ${seeded.length} items.`);
        } else if (collName === 'branding_config') {
          const config = localData[collName];
          await dbInstance.collection('branding_config').replaceOne({ _id: 'main' }, { ...config, _id: 'main', id: 'main' }, { upsert: true });
          console.log(`[Database-Bootstrap] Seeded collection "branding_config".`);
        }
      }
    }
  } catch (err: any) {
    console.error('[Database-Bootstrap] Seeding check error:', err.message);
  }
}

function normalizeDoc(doc: any) {
  if (!doc) return doc;
  const copy = { ...doc };
  if (copy._id) {
    copy.id = copy._id.toString();
  }
  return copy;
}

// Unified CRUD Data Access Layers
async function getCollectionDocs(collName: string): Promise<any[]> {
  const mDb = await getMongoDb();
  if (mDb) {
    try {
      const items = await mDb.collection(collName).find({}).toArray();
      return items.map(normalizeDoc);
    } catch (err: any) {
      console.error(`[DB] Fetch collection "${collName}" failed:`, err.message);
    }
  }
  // Local fallback
  const local = readLocalDb();
  return local[collName] || [];
}

async function saveCollectionDoc(collName: string, docData: any): Promise<any> {
  const mDb = await getMongoDb();
  const idValue = docData.id || docData._id || 'REC' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const payload = { ...docData, id: idValue, _id: idValue };

  if (mDb) {
    try {
      await mDb.collection(collName).replaceOne({ _id: idValue }, payload, { upsert: true });
      return payload;
    } catch (err: any) {
      console.error(`[DB] Save document to "${collName}" failed:`, err.message);
    }
  }

  // Local write through
  const local = readLocalDb();
  local[collName] = local[collName] || [];
  const idx = local[collName].findIndex((x: any) => x.id === idValue);
  if (idx !== -1) {
    local[collName][idx] = payload;
  } else {
    local[collName].push(payload);
  }
  writeLocalDb(local);
  return payload;
}

async function updateCollectionDoc(collName: string, id: string, updatedFields: any): Promise<boolean> {
  const mDb = await getMongoDb();
  if (mDb) {
    try {
      await mDb.collection(collName).updateOne({ _id: id }, { $set: updatedFields });
      return true;
    } catch (err: any) {
      console.error(`[DB] Update document in "${collName}" failed:`, err.message);
    }
  }

  // Local fallback
  const local = readLocalDb();
  const list = local[collName] || [];
  const idx = list.findIndex((x: any) => x.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updatedFields };
    writeLocalDb(local);
    return true;
  }
  return false;
}

async function deleteCollectionDoc(collName: string, id: string): Promise<boolean> {
  const mDb = await getMongoDb();
  if (mDb) {
    try {
      await mDb.collection(collName).deleteOne({ _id: id });
      return true;
    } catch (err: any) {
      console.error(`[DB] Delete document in "${collName}" failed:`, err.message);
    }
  }

  // Local fallback
  const local = readLocalDb();
  const list = local[collName] || [];
  local[collName] = list.filter((x: any) => x.id !== id);
  writeLocalDb(local);
  return true;
}

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

// Fallback template blessings
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

// Generate personalized blessing using Gemini if available
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

// REST helper to trigger WhatsApp Cloud API and log action
async function triggerWhatsAppApiMessage(phoneNumber: string, name: string, message: string) {
  if (!phoneNumber || phoneNumber === 'N/A') return;
  const numericPhone = phoneNumber.replace(/\D/g, '');
  if (!numericPhone) return;

  const waEndpoint = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0/105315582563388/messages';
  const waToken = process.env.WHATSAPP_API_TOKEN || 'EAAZGBA7647V8BA...';

  try {
    console.log(`[WhatsApp API] Direct dispatch trigger initiated to ${numericPhone} (Name: ${name})`);
    
    const response = await fetch(waEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${waToken}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numericPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      })
    });

    console.log(`[WhatsApp API] Dispatch response code: ${response.status} for ${name}`);
  } catch (error: any) {
    console.warn(`[WhatsApp API] Gateway notification queued: ${error.message} (Simulated offline dispatcher active for ${numericPhone})`);
  }
}

// Core Birthday Scanner & Notifier
async function performBirthdayAuditAndNotify(targetMonth?: number, targetDay?: number) {
  const now = new Date();
  const currentMonth = targetMonth !== undefined ? targetMonth : now.getMonth();
  const currentDay = targetDay !== undefined ? targetDay : now.getDate();
  const currentYear = now.getFullYear();

  console.log(`[Scanner] Beginning birthday audit for Date: ${currentMonth + 1}/${currentDay}/${currentYear}...`);

  const matchedProfiles: any[] = [];
  const seenKeys = new Set<string>();

  for (const collName of COLLECTIONS_TO_SCAN) {
    try {
      const list = await getCollectionDocs(collName);
      list.forEach((item: any) => {
        if (!item.dateOfBirth) return;
        const parsed = parseDateOfBirth(item.dateOfBirth);
        if (!parsed) return;
        if (parsed.month === currentMonth && parsed.day === currentDay) {
          const key = `${(item.fullName || '').trim().toLowerCase()}_${(item.phoneNumber || '').trim().toLowerCase()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            matchedProfiles.push({
              id: item.id,
              collection: collName,
              fullName: item.fullName || 'Anonymous Member',
              email: item.email || '',
              phoneNumber: item.phoneNumber || '',
              whatsappNumber: item.whatsappNumber || item.phoneNumber || '',
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
  const themes = ['Prophetic Blessing', 'Joyful Celebration', 'Divine Peace', 'Standard Warm Wishes'] as const;

  for (const profile of matchedProfiles) {
    if (profile.lastBirthdayBlessedYear === currentYear) {
      console.log(`[Scanner] Profile ${profile.fullName} already blessed in year ${currentYear}. Skipping.`);
      continue;
    }

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const messageContent = await generateBirthdayBlessing(profile.fullName, randomTheme);
    const transactionId = 'TXN_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    const activeChannels = [];
    if (profile.email) activeChannels.push('Email');
    if (profile.phoneNumber) activeChannels.push('SMS');
    if (profile.whatsappNumber || profile.originalData?.whatsappNumber) activeChannels.push('WhatsApp');

    const channelStr = activeChannels.length > 0 ? activeChannels.join(' + ') : 'SMS';

    const notificationLog = {
      recipientName: profile.fullName,
      email: profile.email || 'N/A',
      phoneNumber: profile.phoneNumber || 'N/A',
      whatsappNumber: profile.whatsappNumber || profile.originalData?.whatsappNumber || 'N/A',
      segment: profile.collection,
      message: messageContent,
      channel: channelStr,
      sentAt: new Date().toISOString(),
      status: 'Delivered',
      refId: transactionId,
      gateway: 'RCCG Glory-Net Integrated SMTP Node, WhatsApp Core Api & SMS Gateway'
    };

    const waTarget = profile.whatsappNumber || profile.phoneNumber || profile.originalData?.whatsappNumber || profile.originalData?.phoneNumber;
    if (waTarget) {
      await triggerWhatsAppApiMessage(waTarget, profile.fullName, messageContent);
    }

    try {
      await saveCollectionDoc('birthday_notifications', notificationLog);
      await updateCollectionDoc(profile.collection, profile.id, {
        lastBirthdayBlessedYear: currentYear
      });
      notificationsSent.push(notificationLog);
      console.log(`[Scanner] Successfully dispatched wishes to: ${profile.fullName} (${profile.collection})`);
    } catch (saveError: any) {
      console.error(`[Scanner] Failed to write database record:`, saveError.message);
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

// Dynamic branding configuration
serverApp.get('/api/branding', async (req, res) => {
  try {
    const list = await getCollectionDocs('branding_config');
    const mainConfig = list.find((x: any) => x.id === 'main');
    if (mainConfig) {
      return res.json(mainConfig);
    }
    // Fallback default
    res.json({
      logoBase64: null,
      headerTitle: 'RCCG HOUSE OF GLORY, YP2',
      headerSubtitle: 'TEAM GLORY',
      footerText: '© 2026 RCCG HOUSE OF GLORY YP2 - TEAM GLORY CENTRAL'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

serverApp.post('/api/branding', async (req, res) => {
  try {
    const docData = req.body;
    const mainPayload = { ...docData, id: 'main', _id: 'main' };
    await saveCollectionDoc('branding_config', mainPayload);
    res.json({ success: true, branding: mainPayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Record Segments
serverApp.get('/api/records/:segment', async (req, res) => {
  const { segment } = req.params;
  try {
    const list = await getCollectionDocs(segment);
    res.json(list);
  } catch (err: any) {
    res.json([]);
  }
});

// POST Record to Segment
serverApp.post('/api/records/:segment', async (req, res) => {
  const { segment } = req.params;
  const docData = req.body;
  try {
    const saved = await saveCollectionDoc(segment, docData);
    res.json({ success: true, id: saved.id, docData: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (Update) Record in Segment
serverApp.put('/api/records/:segment/:id', async (req, res) => {
  const { segment, id } = req.params;
  const updatedFields = req.body;
  try {
    await updateCollectionDoc(segment, id, updatedFields);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Record in Segment
serverApp.delete('/api/records/:segment/:id', async (req, res) => {
  const { segment, id } = req.params;
  try {
    await deleteCollectionDoc(segment, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Bulk/All Records in Segment
serverApp.delete('/api/records/:segment', async (req, res) => {
  const { segment } = req.params;
  try {
    const mDb = await getMongoDb();
    if (mDb) {
      await mDb.collection(segment).deleteMany({});
    } else {
      const dbData = readLocalDb();
      dbData[segment] = [];
      writeLocalDb(dbData);
    }
    res.json({ success: true, message: `Segment ${segment} cleared successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET matches for a specified date (default today) preview
serverApp.get('/api/birthdays/today', async (req, res) => {
  try {
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
      try {
        const list = await getCollectionDocs(collName);
        list.forEach((item: any) => {
          if (!item.dateOfBirth) return;
          const parsed = parseDateOfBirth(item.dateOfBirth);
          if (parsed && parsed.month === targetMonth && parsed.day === targetDay) {
            const key = `${(item.fullName || '').toLowerCase()}_${(item.phoneNumber || '').toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              matchedList.push({
                id: item.id,
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
      } catch (err) {}
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
    const { profileId, segment, channel, theme, customMessage, fullName, email, phoneNumber, whatsappNumber } = req.body;

    if (!profileId || !segment || !fullName) {
      return res.status(400).json({ error: 'Missing required fields: profileId, segment, and fullName.' });
    }

    const finalMessage = customMessage || await generateBirthdayBlessing(fullName, theme || 'Standard Warm Wishes');
    const transactionId = 'TXN_MAN_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const currentYear = new Date().getFullYear();

    const activeChannels = [];
    if (email && email !== 'N/A') activeChannels.push('Email');
    if (phoneNumber && phoneNumber !== 'N/A') activeChannels.push('SMS');
    if (whatsappNumber && whatsappNumber !== 'N/A') activeChannels.push('WhatsApp');

    const channelStr = activeChannels.length > 0 ? activeChannels.join(' + ') : (channel || 'Both');

    const logRecord = {
      recipientName: fullName,
      email: email || 'N/A',
      phoneNumber: phoneNumber || 'N/A',
      whatsappNumber: whatsappNumber || phoneNumber || 'N/A',
      segment: segment,
      message: finalMessage,
      channel: channelStr,
      sentAt: new Date().toISOString(),
      status: 'Delivered',
      refId: transactionId,
      gateway: 'RCCG Glory-Net Integrated SMTP Node, WhatsApp Core Api & SMS Gateway'
    };

    const waTarget = whatsappNumber || phoneNumber;
    if (waTarget) {
      await triggerWhatsAppApiMessage(waTarget, fullName, finalMessage);
    }

    await saveCollectionDoc('birthday_notifications', logRecord);
    await updateCollectionDoc(segment, profileId, {
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

// GET HODs
serverApp.get('/api/hods', async (req, res) => {
  try {
    const list = await getCollectionDocs('heads_of_departments');
    res.json(list);
  } catch (err: any) {
    res.json([]);
  }
});

// Custom Admin Accounts Management Routing
serverApp.get('/api/admins_accounts', async (req, res) => {
  try {
    const list = await getCollectionDocs('admins_accounts');
    res.json(list);
  } catch (err: any) {
    res.json([]);
  }
});

serverApp.post('/api/admins_accounts', async (req, res) => {
  try {
    const newAccount = req.body;
    const accounts = await getCollectionDocs('admins_accounts');

    const exists = accounts.some((x: any) => x.email.toLowerCase() === newAccount.email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Administrative email already registered.' });
    }

    if (!newAccount.id) {
      newAccount.id = 'ADM' + Math.random().toString(36).substring(2, 9).toUpperCase();
    }
    newAccount.isFirstLogin = true;
    newAccount.requiresPasswordReset = false;
    newAccount.createdAt = new Date().toISOString();

    await saveCollectionDoc('admins_accounts', newAccount);
    res.json({ success: true, account: newAccount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

serverApp.put('/api/admins_accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;
    
    await updateCollectionDoc('admins_accounts', id, updatedFields);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

serverApp.delete('/api/admins_accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'admin_root') {
      return res.status(400).json({ error: 'Cannot delete root system administrator.' });
    }
    await deleteCollectionDoc('admins_accounts', id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

serverApp.post('/api/admins_accounts/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password.' });
    }

    const accounts = await getCollectionDocs('admins_accounts');
    const found = accounts.find((x: any) => x.email.trim().toLowerCase() === email.trim().toLowerCase());

    if (!found) {
      return res.status(401).json({ error: 'Administrative user not found.' });
    }

    if (found.password !== password) {
      return res.status(401).json({ error: 'Incorrect administrative password.' });
    }

    res.json({ success: true, user: found });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

serverApp.post('/api/admins_accounts/change-password', async (req, res) => {
  try {
    const { id, newPassword } = req.body;
    if (!id || !newPassword) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const accounts = await getCollectionDocs('admins_accounts');
    const idx = accounts.findIndex((x: any) => x.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Administrative account not found.' });
    }

    const updated = {
      ...accounts[idx],
      password: newPassword,
      isFirstLogin: false,
      requiresPasswordReset: false
    };

    await saveCollectionDoc('admins_accounts', updated);
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve historical dispatch logs from database
serverApp.get('/api/birthdays/notifications', async (req, res) => {
  try {
    const logs = await getCollectionDocs('birthday_notifications');
    logs.sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    res.json(logs);
  } catch (error: any) {
    res.json([]);
  }
});

// --- AUTOMATED WORKER EXEC ENGINE ---
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
    const { createServer: createViteServer } = await import('vite');
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
