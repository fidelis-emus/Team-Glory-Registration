-- =====================================================================
-- RCCG HOUSE OF GLORY, YP2 - TEAM GLORY CENTRAL
-- SQLite Persistence Engine Schema Definition
-- Deployable in /storage/database.sqlite
-- =====================================================================

PRAGMA foreign_keys = ON;

-- 1. Administrative Accounts Table
CREATE TABLE IF NOT EXISTS admins_accounts (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT DEFAULT 'None',
    isFirstLogin INTEGER DEFAULT 1,
    requiresPasswordReset INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

-- Default Super Administrator Seed
INSERT OR IGNORE INTO admins_accounts (id, fullName, email, password, role, department, isFirstLogin, requiresPasswordReset, createdAt) 
VALUES (
    'admin_root',
    'Super Administrator',
    'admin@teamglory.com',
    'HouseOfGlory2026',
    'SuperAdmin',
    'None',
    1,
    0,
    '2026-01-01T00:00:00.000Z'
);

-- 2. Dynamic Registry Records Tables (Parish Segments)
CREATE TABLE IF NOT EXISTS first_timers (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    residentialAddress TEXT,
    firstUnit TEXT,
    secondUnit TEXT,
    assignedHodId TEXT,
    lastBirthdayBlessedYear INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS first_timer_workers (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    residentialAddress TEXT,
    firstUnit TEXT,
    secondUnit TEXT,
    assignedHodId TEXT,
    lastBirthdayBlessedYear INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    residentialAddress TEXT,
    firstUnit TEXT,
    secondUnit TEXT,
    assignedHodId TEXT,
    lastBirthdayBlessedYear INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_workers (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    residentialAddress TEXT,
    firstUnit TEXT,
    secondUnit TEXT,
    assignedHodId TEXT,
    lastBirthdayBlessedYear INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    residentialAddress TEXT,
    firstUnit TEXT,
    secondUnit TEXT,
    assignedHodId TEXT,
    lastBirthdayBlessedYear INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

-- 3. Training Program Registrations Table
CREATE TABLE IF NOT EXISTS training_registrations (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    trainingProgram TEXT,
    createdAt TEXT NOT NULL
);

-- 4. House fellowships Table
CREATE TABLE IF NOT EXISTS house_fellowship_registrations (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    areaNeighbourhood TEXT,
    closestLandmark TEXT,
    createdAt TEXT NOT NULL
);

-- 5. Interest Groups Table
CREATE TABLE IF NOT EXISTS interest_groups (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    phoneNumber TEXT,
    whatsappNumber TEXT,
    dateOfBirth TEXT,
    activeInterests TEXT,
    createdAt TEXT NOT NULL
);

-- 6. Heads of Departments (HOD Leaders) Table
CREATE TABLE IF NOT EXISTS heads_of_departments (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    department TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    createdAt TEXT NOT NULL
);

-- 7. Birthday Notification Log (Automated Dispatches) Table
CREATE TABLE IF NOT EXISTS birthday_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipientNumber TEXT NOT NULL,
    fullName TEXT NOT NULL,
    messageContent TEXT NOT NULL,
    sentDate TEXT NOT NULL,
    status TEXT NOT NULL,
    errorDetail TEXT,
    createdAt TEXT NOT NULL
);

-- 8. System Administrator License Keys Table
CREATE TABLE IF NOT EXISTS system_license (
    id TEXT PRIMARY KEY,
    licenseKey TEXT NOT NULL,
    activatedAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    status TEXT NOT NULL,
    tier TEXT NOT NULL
);

-- Default active license seed
INSERT OR IGNORE INTO system_license (id, licenseKey, activatedAt, expiresAt, status, tier) 
VALUES (
    'status',
    'GLORY-NET-99X8-44A1-PRO2030',
    '2026-01-01T00:00:00.000Z',
    '2030-12-31T23:59:59.000Z',
    'ACTIVE',
    'Enterprise Pro'
);

-- 9. Branding Content configuration Table
CREATE TABLE IF NOT EXISTS branding_config (
    id TEXT PRIMARY KEY,
    logoBase64 TEXT,
    headerTitle TEXT NOT NULL,
    headerSubtitle TEXT NOT NULL,
    footerText TEXT NOT NULL
);

-- Seed Default branding setup
INSERT OR IGNORE INTO branding_config (id, logoBase64, headerTitle, headerSubtitle, footerText) 
VALUES (
    'current',
    NULL,
    'RCCG HOUSE OF GLORY, YP2',
    'TEAM GLORY',
    '© 2026 RCCG HOUSE OF GLORY YP2 - TEAM GLORY CENTRAL'
);

-- 10. Access Request Log Table
CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    ip TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
