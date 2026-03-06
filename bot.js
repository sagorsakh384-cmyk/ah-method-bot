/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { authenticator } = require("otplib");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAFYIja3-uFmDblVY74_jR9tn6jQhvSBqMk";
const ADMIN_PASSWORD = "sadhin8miya6145";

// ⚠️ IMPORTANT: নিচের ID গুলো আপনার আসল ID দিয়ে পরিবর্তন করুন ⚠️
// ID বের করতে @getidsbot ব্যবহার করুন
const MAIN_CHANNEL = "@blackotpnum";
const MAIN_CHANNEL_ID = -1003306722311; // numeric ID (string নয়)

const CHAT_GROUP = "https://t.me/EarningHub6112";
const CHAT_GROUP_ID = -1003247504066; // আপনার গ্রুপের সঠিক ID

const OTP_GROUP = "https://t.me/Spideyhuntotp";
const OTP_GROUP_ID = -1003007557624; // আপনার OTP গ্রুপের সঠিক ID

/******************** FILES ********************/
// Railway Volume support - data হারাবে না restart হলেও
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH)
  : __dirname;

console.log(`📁 Data Directory: ${DATA_DIR}`);

const NUMBERS_FILE = path.join(DATA_DIR, "numbers.txt");
const COUNTRIES_FILE = path.join(DATA_DIR, "countries.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SERVICES_FILE = path.join(DATA_DIR, "services.json");
const ACTIVE_NUMBERS_FILE = path.join(DATA_DIR, "active_numbers.json");
const OTP_LOG_FILE = path.join(DATA_DIR, "otp_log.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const TOTP_SECRETS_FILE = path.join(DATA_DIR, "totp_secrets.json");
const TEMP_MAILS_FILE = path.join(DATA_DIR, "temp_mails.json");
const EARNINGS_FILE = path.join(DATA_DIR, "earnings.json");
const WITHDRAW_FILE = path.join(DATA_DIR, "withdrawals.json");
const COUNTRY_PRICES_FILE = path.join(DATA_DIR, "country_prices.json");

/******************** DEFAULT SETTINGS ********************/
let settings = {
  defaultNumberCount: 10,
  cooldownSeconds: 5,
  requireVerification: true,
  minWithdraw: 50,          // সর্বনিম্ন withdraw পরিমাণ (টাকা)
  defaultOtpPrice: 0.25,    // default OTP price per country (টাকা)
  withdrawMethods: ["bKash", "Nagad"],
  withdrawEnabled: true
};

/******************** LOAD SETTINGS ********************/
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading settings:", e);
  }
} else {
  saveSettings();
}

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN not set correctly");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/******************** LOAD DATA ********************/
let countries = {};
if (fs.existsSync(COUNTRIES_FILE)) {
  try {
    countries = JSON.parse(fs.readFileSync(COUNTRIES_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading countries:", e);
    countries = {};
  }
} else {
  countries = {
    "880": { name: "Bangladesh", flag: "🇧🇩" },
    "91": { name: "India", flag: "🇮🇳" },
    "92": { name: "Pakistan", flag: "🇵🇰" },
    "1": { name: "USA", flag: "🇺🇸" },
    "44": { name: "UK", flag: "🇬🇧" },
    "977": { name: "Nepal", flag: "🇳🇵" }
  };
  saveCountries();
}

let services = {};
if (fs.existsSync(SERVICES_FILE)) {
  try {
    services = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading services:", e);
    services = {};
  }
} else {
  services = {
    "whatsapp": { name: "WhatsApp", icon: "📱" },
    "telegram": { name: "Telegram", icon: "✈️" },
    "facebook": { name: "Facebook", icon: "📘" },
    "instagram": { name: "Instagram", icon: "📸" },
    "google": { name: "Google", icon: "🔍" },
    "verification": { name: "Verification", icon: "✅" },
    "other": { name: "Other", icon: "🔧" }
  };
  saveServices();
}

let numbersByCountryService = {};
if (fs.existsSync(NUMBERS_FILE)) {
  try {
    const lines = fs.readFileSync(NUMBERS_FILE, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (!lineTrimmed) continue;

      let number, countryCode, service;

      if (lineTrimmed.includes("|")) {
        const parts = lineTrimmed.split("|");
        if (parts.length >= 3) {
          number = parts[0].trim();
          countryCode = parts[1].trim();
          service = parts[2].trim();
        } else if (parts.length === 2) {
          number = parts[0].trim();
          countryCode = parts[1].trim();
          service = "other";
        } else {
          continue;
        }
      } else {
        number = lineTrimmed;
        countryCode = getCountryCodeFromNumber(number);
        service = "other";
      }

      if (!/^\d{10,15}$/.test(number)) continue;
      if (!countryCode) continue;

      numbersByCountryService[countryCode] = numbersByCountryService[countryCode] || {};
      numbersByCountryService[countryCode][service] = numbersByCountryService[countryCode][service] || [];

      if (!numbersByCountryService[countryCode][service].includes(number)) {
        numbersByCountryService[countryCode][service].push(number);
      }
    }

    console.log(`✅ Loaded ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length} numbers`);
  } catch (e) {
    console.error("❌ Error loading numbers:", e);
    numbersByCountryService = {};
  }
}

let users = {};
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading users:", e);
    users = {};
  }
}

let activeNumbers = {};
if (fs.existsSync(ACTIVE_NUMBERS_FILE)) {
  try {
    activeNumbers = JSON.parse(fs.readFileSync(ACTIVE_NUMBERS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading active numbers:", e);
    activeNumbers = {};
  }
}

let otpLog = [];
if (fs.existsSync(OTP_LOG_FILE)) {
  try {
    otpLog = JSON.parse(fs.readFileSync(OTP_LOG_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading OTP log:", e);
    otpLog = [];
  }
}

let admins = [];
if (fs.existsSync(ADMINS_FILE)) {
  try {
    admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading admins:", e);
    admins = [];
  }
}

// TOTP Secrets storage: { userId: [ { label, secret, service } ] }
let totpSecrets = {};
if (fs.existsSync(TOTP_SECRETS_FILE)) {
  try { totpSecrets = JSON.parse(fs.readFileSync(TOTP_SECRETS_FILE, 'utf8')); }
  catch (e) { totpSecrets = {}; }
}

// Temp Mails storage: { userId: { address, password, token } }
let tempMails = {};
if (fs.existsSync(TEMP_MAILS_FILE)) {
  try { tempMails = JSON.parse(fs.readFileSync(TEMP_MAILS_FILE, 'utf8')); }
  catch (e) { tempMails = {}; }
}

// Earnings storage: { userId: { balance, totalEarned, otpCount } }
let earnings = {};
if (fs.existsSync(EARNINGS_FILE)) {
  try { earnings = JSON.parse(fs.readFileSync(EARNINGS_FILE, 'utf8')); }
  catch (e) { earnings = {}; }
}

// Withdrawals: [ { userId, amount, method, account, status, requestedAt, processedAt } ]
let withdrawals = [];
if (fs.existsSync(WITHDRAW_FILE)) {
  try { withdrawals = JSON.parse(fs.readFileSync(WITHDRAW_FILE, 'utf8')); }
  catch (e) { withdrawals = []; }
}

// Country Prices: { countryCode: priceInTaka }
let countryPrices = {};
if (fs.existsSync(COUNTRY_PRICES_FILE)) {
  try { countryPrices = JSON.parse(fs.readFileSync(COUNTRY_PRICES_FILE, 'utf8')); }
  catch (e) { countryPrices = {}; }
}

/******************** SAVE FUNCTIONS ********************/
function saveSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("❌ Error saving settings:", error);
  }
}

function saveNumbers() {
  try {
    const lines = [];
    for (const countryCode in numbersByCountryService) {
      for (const service in numbersByCountryService[countryCode]) {
        for (const number of numbersByCountryService[countryCode][service]) {
          lines.push(`${number}|${countryCode}|${service}`);
        }
      }
    }
    fs.writeFileSync(NUMBERS_FILE, lines.join("\n"));
  } catch (error) {
    console.error("❌ Error saving numbers:", error);
  }
}

function saveCountries() {
  try {
    fs.writeFileSync(COUNTRIES_FILE, JSON.stringify(countries, null, 2));
  } catch (error) {
    console.error("❌ Error saving countries:", error);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("❌ Error saving users:", error);
  }
}

function saveServices() {
  try {
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));
  } catch (error) {
    console.error("❌ Error saving services:", error);
  }
}

function saveActiveNumbers() {
  try {
    fs.writeFileSync(ACTIVE_NUMBERS_FILE, JSON.stringify(activeNumbers, null, 2));
  } catch (error) {
    console.error("❌ Error saving active numbers:", error);
  }
}

function saveOTPLog() {
  try {
    fs.writeFileSync(OTP_LOG_FILE, JSON.stringify(otpLog.slice(-1000), null, 2));
  } catch (error) {
    console.error("❌ Error saving OTP log:", error);
  }
}

function saveAdmins() {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error("❌ Error saving admins:", error);
  }
}

function saveTotpSecrets() {
  try {
    fs.writeFileSync(TOTP_SECRETS_FILE, JSON.stringify(totpSecrets, null, 2));
  } catch (error) {
    console.error("❌ Error saving TOTP secrets:", error);
  }
}

function saveTempMails() {
  try {
    fs.writeFileSync(TEMP_MAILS_FILE, JSON.stringify(tempMails, null, 2));
  } catch (error) {
    console.error("❌ Error saving temp mails:", error);
  }
}

function saveEarnings() {
  try {
    fs.writeFileSync(EARNINGS_FILE, JSON.stringify(earnings, null, 2));
  } catch (error) {
    console.error("❌ Error saving earnings:", error);
  }
}

function saveWithdrawals() {
  try {
    fs.writeFileSync(WITHDRAW_FILE, JSON.stringify(withdrawals, null, 2));
  } catch (error) {
    console.error("❌ Error saving withdrawals:", error);
  }
}

function saveCountryPrices() {
  try {
    fs.writeFileSync(COUNTRY_PRICES_FILE, JSON.stringify(countryPrices, null, 2));
  } catch (error) {
    console.error("❌ Error saving country prices:", error);
  }
}

/******************** EARNINGS HELPERS ********************/
function getUserEarnings(userId) {
  const uid = userId.toString();
  if (!earnings[uid]) {
    earnings[uid] = { balance: 0, totalEarned: 0, otpCount: 0 };
  }
  return earnings[uid];
}

function getOtpPriceForCountry(countryCode) {
  return countryPrices[countryCode] !== undefined
    ? countryPrices[countryCode]
    : (settings.defaultOtpPrice || 0.25);
}

function addEarning(userId, countryCode) {
  const uid = userId.toString();
  const price = getOtpPriceForCountry(countryCode);
  if (!earnings[uid]) earnings[uid] = { balance: 0, totalEarned: 0, otpCount: 0 };
  earnings[uid].balance = parseFloat((earnings[uid].balance + price).toFixed(2));
  earnings[uid].totalEarned = parseFloat((earnings[uid].totalEarned + price).toFixed(2));
  earnings[uid].otpCount = (earnings[uid].otpCount || 0) + 1;
  saveEarnings();
  return price;
}

/******************** HELPER FUNCTIONS ********************/
function isAdmin(userId) {
  return admins.includes(userId.toString());
}

function getCountryCodeFromNumber(n) {
  const numStr = n.toString();

  const code3 = numStr.slice(0, 3);
  if (countries[code3]) return code3;

  const code2 = numStr.slice(0, 2);
  if (countries[code2]) return code2;

  const code1 = numStr.slice(0, 1);
  if (countries[code1]) return code1;

  return null;
}

function getCountryFromNumber(number) {
  const numStr = number.toString();

  for (const length of [3, 2, 1]) {
    const code = numStr.slice(0, length);
    if (countries[code]) {
      return countries[code];
    }
  }

  return { name: "Unknown", flag: "🏴‍☠️" };
}

function getAvailableCountriesForService(service) {
  const availableCountries = [];
  for (const countryCode in numbersByCountryService) {
    if (numbersByCountryService[countryCode][service] && 
        numbersByCountryService[countryCode][service].length > 0 &&
        countries[countryCode]) {
      availableCountries.push(countryCode);
    }
  }
  return availableCountries;
}

function getMultipleNumbersByCountryAndService(countryCode, service, userId, count) {
  if (!numbersByCountryService[countryCode] || !numbersByCountryService[countryCode][service]) {
    return [];
  }

  if (numbersByCountryService[countryCode][service].length < count) {
    return [];
  }

  const numbers = [];
  for (let i = 0; i < count; i++) {
    const number = numbersByCountryService[countryCode][service].shift();
    numbers.push(number);

    activeNumbers[number] = {
      userId: userId,
      countryCode: countryCode,
      service: service,
      assignedAt: new Date().toISOString(),
      lastOTP: null,
      otpCount: 0
    };
  }

  saveNumbers();
  saveActiveNumbers();

  return numbers;
}

function maskPhoneNumber(phone) {
  const digitsOnly = phone.replace(/\D/g, '');
  const total = digitsOnly.length;

  if (total <= 7) return phone;

  const showStart = Math.max(total - 6, 4);
  const startPart = digitsOnly.slice(0, showStart);
  const endPart = digitsOnly.slice(showStart + 3);

  return `${startPart}ⓎⓄⓊ${endPart}`;
}

function extractPhoneNumberFromMessage(text) {
  if (!text) return null;

  // ১. Full number (10-15 digit)
  const fullMatch = text.match(/\+?(\d{10,15})/);
  if (fullMatch) {
    const num = fullMatch[1];
    if (num.length >= 10 && num.length <= 15) return num;
  }

  return null;
}

// OTP message থেকে number বের করে activeNumbers-এ খোঁজে
function findMatchingActiveNumber(messageText) {
  const allActive = Object.keys(activeNumbers);
  if (allActive.length === 0) return null;

  // Step 1: Full number direct match
  const extracted = extractPhoneNumberFromMessage(messageText);
  if (extracted) {
    if (activeNumbers[extracted]) return extracted;
    // + sign ছাড়া try
    const noPlus = extracted.replace(/^\+/, '');
    if (activeNumbers[noPlus]) return noPlus;
  }

  // Step 2: activeNumbers-এর প্রতিটা number দিয়ে message-এ খুঁজি
  // শেষ থেকে বড় match আগে চেক করি (8 → 6 → 4 digit)
  for (const num of allActive) {
    if (messageText.includes(num)) return num;           // full number
  }
  for (const num of allActive) {
    const last8 = num.slice(-8);
    if (messageText.includes(last8)) return num;
  }
  for (const num of allActive) {
    const last6 = num.slice(-6);
    if (messageText.includes(last6)) return num;
  }
  for (const num of allActive) {
    const last4 = num.slice(-4);
    if (last4 && messageText.includes(last4)) return num;
  }

  return null;
}

// Message থেকে OTP/verification code বের করি
function extractOTPCode(text) {
  if (!text) return null;
  const patterns = [
    /(?:otp|code|কোড|pin|verification|verify|token)[^\d]{0,10}(\d{4,8})/i,
    /(?:is|হলো|হল|:)\s*(\d{4,8})\b/i,
    /\b(\d{6})\b/,  // সবচেয়ে common — 6 digit OTP
    /\b(\d{4})\b/,  // 4 digit OTP
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].length >= 4 && m[1].length <= 8) return m[1];
  }
  return null;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval + " years ago";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval + " months ago";
  }
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval + " days ago";
  }
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval + " hours ago";
  }
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}

/******************** MAIL.TM API HELPERS ********************/
function mailApiRequest(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.mail.tm",
      path: endpoint,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    };
    if (token) options.headers["Authorization"] = `Bearer ${token}`;
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) options.headers["Content-Length"] = Buffer.byteLength(bodyStr);

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, data: {} });
        }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function getMailTmDomain() {
  const res = await mailApiRequest("GET", "/domains?page=1", null, null);
  if (res.status === 200 && res.data["hydra:member"]?.length > 0) {
    return res.data["hydra:member"][0].domain;
  }
  return "mail.tm";
}

async function createTempMailAccount(address, password) {
  const res = await mailApiRequest("POST", "/accounts", { address, password });
  return res;
}

async function getTempMailToken(address, password) {
  const res = await mailApiRequest("POST", "/token", { address, password });
  return res;
}

async function getTempMailMessages(token) {
  const res = await mailApiRequest("GET", "/messages?page=1", null, token);
  return res;
}

function generateRandomString(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/******************** TOTP HELPER ********************/
function generateTOTP(secret) {
  try {
    // Clean secret - remove spaces
    const cleanSecret = secret.replace(/\s/g, "").toUpperCase();
    authenticator.options = { step: 30 };
    const token = authenticator.generate(cleanSecret);
    const timeRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    return { token, timeRemaining };
  } catch (e) {
    return null;
  }
}

/******************** VERIFICATION FUNCTION ********************/
async function checkUserMembership(ctx) {
  try {
    const userId = ctx.from.id;
    
    console.log(`Checking membership for user ${userId}`);
    console.log(`Main Channel ID: ${MAIN_CHANNEL_ID}`);
    console.log(`Chat Group ID: ${CHAT_GROUP_ID}`);
    console.log(`OTP Group ID: ${OTP_GROUP_ID}`);

    let isMainChannelMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(MAIN_CHANNEL_ID, userId);
      isMainChannelMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      console.log(`Main Channel membership: ${isMainChannelMember}`);
    } catch (error) {
      console.log("Error checking main channel:", error.message);
    }

    let isChatGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(CHAT_GROUP_ID, userId);
      isChatGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      console.log(`Chat Group membership: ${isChatGroupMember}`);
    } catch (error) {
      console.log("Error checking chat group:", error.message);
    }

    let isOTPGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(OTP_GROUP_ID, userId);
      isOTPGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      console.log(`OTP Group membership: ${isOTPGroupMember}`);
    } catch (error) {
      console.log("Error checking OTP group:", error.message);
    }

    return {
      mainChannel: isMainChannelMember,
      chatGroup: isChatGroupMember,
      otpGroup: isOTPGroupMember,
      allJoined: isMainChannelMember && isChatGroupMember && isOTPGroupMember
    };

  } catch (error) {
    console.error("Membership check error:", error);
    return {
      mainChannel: false,
      chatGroup: false,
      otpGroup: false,
      allJoined: false
    };
  }
}

/******************** SESSION MIDDLEWARE ********************/
bot.use(session({
  defaultSession: () => ({
    verified: false,
    isAdmin: false,
    adminState: null,
    adminData: null,
    currentNumbers: [],
    currentService: null,
    currentCountry: null,
    lastNumberTime: 0,
    lastMessageId: null,
    lastChatId: null,
    lastVerificationCheck: 0,
    totpState: null,
    totpData: null,
    mailState: null,
    withdrawState: null,   // ← 'waiting_account' | 'confirm'
    withdrawData: null     // ← { method, account, amount }
  })
}));

bot.use((ctx, next) => {
  if (ctx.from) {
    const userId = ctx.from.id.toString();
    if (!users[userId]) {
      users[userId] = {
        id: userId,
        username: ctx.from.username || 'no_username',
        first_name: ctx.from.first_name || 'User',
        last_name: ctx.from.last_name || '',
        joined: new Date().toISOString(),
        last_active: new Date().toISOString(),
        verified: ctx.session?.verified || false
      };
      saveUsers();
    } else {
      users[userId].last_active = new Date().toISOString();
      saveUsers();
    }
  }

  ctx.session = ctx.session || {
    verified: false,
    isAdmin: false,
    adminState: null,
    adminData: null,
    currentNumbers: [],
    currentService: null,
    currentCountry: null,
    lastNumberTime: 0,
    lastMessageId: null,
    lastChatId: null,
    lastVerificationCheck: 0
  };

  if (ctx.from && !ctx.session.isAdmin) {
    ctx.session.isAdmin = isAdmin(ctx.from.id.toString());
  }

  return next();
});

/******************** HELPER: সব user state clear করো ********************/
function clearUserState(ctx) {
  ctx.session.withdrawState = null;
  ctx.session.withdrawData = null;
  ctx.session.totpState    = null;
  ctx.session.totpData     = null;
  ctx.session.adminState   = null;
  ctx.session.adminData    = null;
}

/******************** VERIFICATION MIDDLEWARE ********************/
bot.use(async (ctx, next) => {
  // Admin সবসময় pass
  if (ctx.session?.isAdmin) return next();

  // OTP group-এর messages block করা যাবে না
  if (ctx.chat?.id === OTP_GROUP_ID) return next();

  // /start এবং /adminlogin সবসময় pass
  if (ctx.message?.text?.startsWith('/start') || 
      ctx.message?.text?.startsWith('/adminlogin') ||
      ctx.message?.text?.startsWith('/cancel')) {
    return next();
  }

  // Verification button সবসময় pass
  if (ctx.callbackQuery?.data === 'verify_user') return next();

  if (!ctx.from) return next();

  // Verification বন্ধ থাকলে সবাই pass
  if (!settings.requireVerification) return next();

  // Session-এ verified থাকলে pass
  if (ctx.session?.verified) return next();

  // users.json থেকে verified status check করো (bot restart-এর পরেও কাজ করবে)
  const userId = ctx.from.id.toString();
  if (users[userId]?.verified) {
    ctx.session.verified = true;
    return next();
  }

  // 24 ঘন্টার মধ্যে check হলে pass (performance optimization)
  const now = Date.now();
  if (ctx.session?.lastVerificationCheck && 
      (now - ctx.session.lastVerificationCheck) < 24 * 60 * 60 * 1000) {
    return next();
  }

  // callbackQuery হলে live membership check করো
  if (ctx.callbackQuery) {
    const membership = await checkUserMembership(ctx);
    if (membership.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = now;
      if (users[userId]) { users[userId].verified = true; saveUsers(); }
      return next();
    }
    await ctx.answerCbQuery("⛔ আগে /start দিয়ে verify করুন!", { show_alert: true });
    return;
  }

  // Message হলে live check করো
  const membership = await checkUserMembership(ctx);
  if (membership.allJoined) {
    ctx.session.verified = true;
    ctx.session.lastVerificationCheck = now;
    if (users[userId]) { users[userId].verified = true; saveUsers(); }
    return next();
  }

  try {
    await ctx.reply(
      "⛔ *Verification Required*\n\n" +
      "বটটি ব্যবহার করতে নিচের ৩টি group-এ join করুন:\n\n" +
      "1️⃣ 📢 *Main Channel:* @blackotpnum\n" +
      "2️⃣ 💬 *Chat Group:* Smart Earning Hub\n" +
      "3️⃣ 📨 *OTP Group:* @Spideyhuntotp\n\n" +
      "👉 /start দিন এবং VERIFY বাটন চাপুন।",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "1️⃣ 📢 Main Channel", url: "https://t.me/blackotpnum" }],
            [{ text: "2️⃣ 💬 Chat Group", url: "https://t.me/EarningHub6112" }],
            [{ text: "3️⃣ 📨 OTP Group", url: "https://t.me/Spideyhuntotp" }],
            [{ text: "✅ VERIFY করুন", callback_data: "verify_user" }]
          ]
        }
      }
    );
  } catch (error) {
    console.log("Could not reply to user:", error.message);
  }
  return;
});

/******************** SHOW MAIN MENU ********************/
async function showMainMenu(ctx) {
  try {
    await ctx.reply(
      "🏠 *Main Menu*\n\nChoose an option:",
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            ["☎️ Get Number", "📧 Get Tempmail"],
            ["🔐 2FA", "💰 Balances"],
            ["💸 Withdraw", "⬇️ OTHER"]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
  } catch (error) {
    console.error("Error showing main menu:", error);
  }
}

/******************** START COMMAND ********************/
bot.start(async (ctx) => {
  try {
    ctx.session.verified = false;
    ctx.session.currentNumbers = [];
    ctx.session.currentService = null;
    ctx.session.currentCountry = null;
    ctx.session.lastNumberTime = 0;
    ctx.session.lastMessageId = null;
    ctx.session.lastChatId = null;
    ctx.session.lastVerificationCheck = 0;
    ctx.session.totpState = null;
    ctx.session.totpData = null;
    ctx.session.mailState = null;
    ctx.session.withdrawState = null;
    ctx.session.withdrawData = null;

    if (!settings.requireVerification) {
      ctx.session.verified = true;
      return showMainMenu(ctx);
    }

    await ctx.reply(
      "🤖 *Welcome to Number Bot*\n\n" +
      "🔐 *VERIFICATION REQUIRED - 3 GROUPS*\n" +
      "To use this bot, you MUST join ALL three groups first:\n\n" +
      "1️⃣ 📢 *Main Channel:* @blackotpnum\n" +
      "2️⃣ 💬 *Chat Group:* Smart Earning Hub\n" +
      "3️⃣ 📨 *OTP Group:* @Spideyhuntotp\n\n" +
      "👇 Click the buttons below to join:",
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: "1️⃣ 📢 Main Channel", url: "https://t.me/blackotpnum" }],
            [{ text: "2️⃣ 💬 Chat Group", url: CHAT_GROUP }],
            [{ text: "3️⃣ 📨 OTP Group", url: OTP_GROUP }],
            [{ text: "✅ VERIFY MEMBERSHIP", callback_data: "verify_user" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Start command error:", error);
  }
});

/******************** VERIFICATION ********************/
bot.action("verify_user", async (ctx) => {
  try {
    await ctx.answerCbQuery("⏳ Checking all 3 groups...");

    const membership = await checkUserMembership(ctx);

    if (membership.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = Date.now();

      const uid = ctx.from.id.toString();
      if (users[uid]) {
        users[uid].verified = true;
        saveUsers();
      }

      await ctx.editMessageText(
        "✅ *VERIFICATION SUCCESSFUL!*\n\n" +
        "You have joined all 3 required groups.\n" +
        "You can now use all bot features.",
        { parse_mode: "Markdown" }
      );

      await showMainMenu(ctx);

    } else {
      let notJoinedMsg = "❌ *VERIFICATION FAILED*\n\nYou haven't joined the following groups:\n";

      if (!membership.mainChannel) notJoinedMsg += "❌ 1️⃣ Main Channel\n";
      if (!membership.chatGroup) notJoinedMsg += "❌ 2️⃣ Chat Group\n";
      if (!membership.otpGroup) notJoinedMsg += "❌ 3️⃣ OTP Group\n";

      notJoinedMsg += "\nPlease join ALL three groups and click VERIFY again.";

      await ctx.editMessageText(notJoinedMsg, { parse_mode: "Markdown" });
    }

  } catch (error) {
    console.error("Verification error:", error);
    await ctx.answerCbQuery("❌ Verification failed", { show_alert: true });
  }
});

/******************** GET NUMBERS ********************/
bot.hears(["📞 Get Numbers", "☎️ Get Number"], async (ctx) => {
  clearUserState(ctx);
  // সার্ভিস বাটন ২টি করে row-এ সাজাই
  const availableServices = [];
  for (const serviceId in services) {
    const service = services[serviceId];
    const availableCountries = getAvailableCountriesForService(serviceId);
    if (availableCountries.length > 0) {
      // মোট number count
      let totalNums = 0;
      for (const cc of availableCountries) {
        totalNums += (numbersByCountryService[cc]?.[serviceId]?.length || 0);
      }
      availableServices.push({ serviceId, service, totalNums });
    }
  }

  if (availableServices.length === 0) {
    return await ctx.reply(
      "📭 *কোনো Number নেই*\n\n" +
      "দুঃখিত, এই মুহূর্তে সব number ব্যবহৃত হচ্ছে।\n" +
      "পরে আবার চেষ্টা করুন অথবা admin-এর সাথে যোগাযোগ করুন।",
      { parse_mode: "Markdown" }
    );
  }

  // ২টি করে row
  const serviceButtons = [];
  for (let i = 0; i < availableServices.length; i += 2) {
    const row = [];
    row.push({
      text: `${availableServices[i].service.icon} ${availableServices[i].service.name} (${availableServices[i].totalNums})`,
      callback_data: `select_service:${availableServices[i].serviceId}`
    });
    if (availableServices[i + 1]) {
      row.push({
        text: `${availableServices[i+1].service.icon} ${availableServices[i+1].service.name} (${availableServices[i+1].totalNums})`,
        callback_data: `select_service:${availableServices[i+1].serviceId}`
      });
    }
    serviceButtons.push(row);
  }

  await ctx.reply(
    "🎯 *Service সিলেক্ট করুন*\n\n" +
    "কোন সার্ভিসের জন্য নম্বর নিতে চান?\n" +
    "_(বন্ধনীতে available number সংখ্যা)_",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: serviceButtons }
    }
  );
});

/******************** SERVICE SELECTION ********************/
bot.action(/^select_service:(.+)$/, async (ctx) => {
  try {
    const serviceId = ctx.match[1];
    const availableCountries = getAvailableCountriesForService(serviceId);

    if (availableCountries.length === 0) {
      return await ctx.answerCbQuery("❌ এই সার্ভিসে কোনো number নেই", { show_alert: true });
    }

    const service = services[serviceId];

    // price দিয়ে sort (কম দামে আগে)
    const sortedCountries = [...availableCountries].sort((a, b) =>
      getOtpPriceForCountry(a) - getOtpPriceForCountry(b)
    );

    // ২টি করে row বানাই
    const countryButtons = [];
    for (let i = 0; i < sortedCountries.length; i += 2) {
      const row = [];
      const cc1 = sortedCountries[i];
      const c1 = countries[cc1];
      const price1 = getOtpPriceForCountry(cc1);
      row.push({
        text: `${c1.flag} ${c1.name} (${price1.toFixed(2)}TK)`,
        callback_data: `select_country:${serviceId}:${cc1}`
      });
      if (sortedCountries[i + 1]) {
        const cc2 = sortedCountries[i + 1];
        const c2 = countries[cc2];
        const price2 = getOtpPriceForCountry(cc2);
        row.push({
          text: `${c2.flag} ${c2.name} (${price2.toFixed(2)}TK)`,
          callback_data: `select_country:${serviceId}:${cc2}`
        });
      }
      countryButtons.push(row);
    }

    countryButtons.push([{ text: "🔙 সার্ভিস লিস্টে ফিরুন", callback_data: "back_to_services" }]);

    await ctx.editMessageText(
      `${service.icon} *${service.name}* — দেশ সিলেক্ট করুন\n\n` +
      `📌 OTP পেলে স্বয়ংক্রিয়ভাবে balance যোগ হবে\n` +
      `_( টাকা = প্রতি OTP-এ আয় )_`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: countryButtons }
      }
    );

  } catch (error) {
    console.error("Service selection error:", error);
    await ctx.answerCbQuery("❌ Error", { show_alert: true });
  }
});

/******************** COUNTRY SELECTION ********************/
bot.action(/^select_country:(.+):(.+)$/, async (ctx) => {
  try {
    const serviceId = ctx.match[1];
    const countryCode = ctx.match[2];
    const userId = ctx.from.id.toString();
    const numberCount = settings.defaultNumberCount;

    const now = Date.now();
    const timeSinceLast = now - ctx.session.lastNumberTime;
    const cooldown = settings.cooldownSeconds * 1000;

    if (timeSinceLast < cooldown && ctx.session.currentNumbers.length > 0) {
      const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
      return await ctx.answerCbQuery(`⏳ Wait ${remaining}s`, { show_alert: true });
    }

    const numbers = getMultipleNumbersByCountryAndService(countryCode, serviceId, userId, numberCount);

    if (numbers.length === 0) {
      return await ctx.answerCbQuery(`❌ Not enough numbers available.`, { show_alert: true });
    }

    if (ctx.session.currentNumbers.length > 0) {
      ctx.session.currentNumbers.forEach(num => {
        if (activeNumbers[num]) {
          delete activeNumbers[num];
        }
      });
      saveActiveNumbers();
    }

    ctx.session.currentNumbers = numbers;
    ctx.session.currentService = serviceId;
    ctx.session.currentCountry = countryCode;
    ctx.session.lastNumberTime = now;

    const country  = countries[countryCode];
    const service  = services[serviceId];
    const otpPrice = getOtpPriceForCountry(countryCode);

    let numbersText = '';
    numbers.forEach((num, i) => {
      numbersText += `${i + 1}. \`+${num}\`\n`;
    });

    const message =
      `✅ *${numbers.length}টি Number পেয়েছেন!*\n\n` +
      `${service.icon} *সার্ভিস:* ${service.name}\n` +
      `${country.flag} *দেশ:* ${country.name}\n` +
      `💵 *প্রতি OTP আয়:* ${otpPrice.toFixed(2)} টাকা\n\n` +
      `📞 *Numbers:*\n${numbersText}\n` +
      `📌 Number টি OTP Group-এ দিন।\n` +
      `OTP আসলে বটে সাথে সাথে দেখাবে ও balance যোগ হবে।`;

    const sentMessage = await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📨 OTP Group খুলুন', url: OTP_GROUP }],
          [{ text: '🔄 নতুন Number নিন', callback_data: `get_new_numbers:${serviceId}:${countryCode}` }],
          [{ text: '🔙 সার্ভিস লিস্ট', callback_data: 'back_to_services' }]
        ]
      }
    });

    if (sentMessage && sentMessage.message_id) {
      ctx.session.lastMessageId = sentMessage.message_id;
      ctx.session.lastChatId = ctx.chat.id;
    }

  } catch (error) {
    console.error("Country selection error:", error);
    await ctx.answerCbQuery("❌ Error getting numbers", { show_alert: true });
  }
});

/******************** GET NEW NUMBERS ********************/
bot.action(/^get_new_numbers:(.+):(.+)$/, async (ctx) => {
  try {
    const serviceId = ctx.match[1];
    const countryCode = ctx.match[2];
    const userId = ctx.from.id.toString();
    const numberCount = settings.defaultNumberCount;

    const now = Date.now();
    const timeSinceLast = now - ctx.session.lastNumberTime;
    const cooldown = settings.cooldownSeconds * 1000;

    if (timeSinceLast < cooldown) {
      const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
      return await ctx.answerCbQuery(`⏳ Wait ${remaining}s`, { show_alert: true });
    }

    const numbers = getMultipleNumbersByCountryAndService(countryCode, serviceId, userId, numberCount);

    if (numbers.length === 0) {
      return await ctx.answerCbQuery(`❌ Not enough numbers available.`, { show_alert: true });
    }

    if (ctx.session.currentNumbers.length > 0) {
      ctx.session.currentNumbers.forEach(num => {
        if (activeNumbers[num]) {
          delete activeNumbers[num];
        }
      });
      saveActiveNumbers();
    }

    ctx.session.currentNumbers = numbers;
    ctx.session.lastNumberTime = now;

    const country  = countries[countryCode];
    const service  = services[serviceId];
    const otpPrice = getOtpPriceForCountry(countryCode);

    let numbersText = '';
    numbers.forEach((num, i) => {
      numbersText += `${i + 1}. \`+${num}\`\n`;
    });

    const message =
      `🔄 *${numbers.length}টি নতুন Number!*\n\n` +
      `${service.icon} *সার্ভিস:* ${service.name}\n` +
      `${country.flag} *দেশ:* ${country.name}\n` +
      `💵 *প্রতি OTP আয়:* ${otpPrice.toFixed(2)} টাকা\n\n` +
      `📞 *Numbers:*\n${numbersText}\n` +
      `📌 Number টি OTP Group-এ দিন।\n` +
      `OTP আসলে বটে সাথে সাথে দেখাবে ও balance যোগ হবে।`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📨 OTP Group খুলুন', url: OTP_GROUP }],
          [{ text: '🔄 নতুন Number নিন', callback_data: `get_new_numbers:${serviceId}:${countryCode}` }],
          [{ text: '🔙 সার্ভিস লিস্ট', callback_data: 'back_to_services' }]
        ]
      }
    });

  } catch (error) {
    console.error("Get new numbers error:", error);
    await ctx.answerCbQuery("❌ Error", { show_alert: true });
  }
});

/******************** CHANGE NUMBERS ********************/
bot.hears("🔄 Change Numbers", async (ctx) => {
  if (ctx.session.currentNumbers.length === 0) {
    return await ctx.reply("❌ You don't have any active numbers. Use '📞 Get Numbers' first.");
  }

  const now = Date.now();
  const timeSinceLast = now - ctx.session.lastNumberTime;
  const cooldown = settings.cooldownSeconds * 1000;

  if (timeSinceLast < cooldown) {
    const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
    return await ctx.reply(`⏳ Please wait ${remaining} seconds before changing numbers.`);
  }

  const serviceId = ctx.session.currentService;
  const countryCode = ctx.session.currentCountry;
  const userId = ctx.from.id.toString();

  const numbers = getMultipleNumbersByCountryAndService(countryCode, serviceId, userId, settings.defaultNumberCount);

  if (numbers.length === 0) {
    return await ctx.reply("❌ No more numbers available for this service/country.");
  }

  if (ctx.session.currentNumbers.length > 0) {
    ctx.session.currentNumbers.forEach(num => {
      if (activeNumbers[num]) {
        delete activeNumbers[num];
      }
    });
    saveActiveNumbers();
  }

  ctx.session.currentNumbers = numbers;
  ctx.session.lastNumberTime = now;

  const country  = countries[countryCode];
  const service  = services[serviceId];
  const otpPrice = getOtpPriceForCountry(countryCode);

  let numbersText = '';
  numbers.forEach((num, i) => {
    numbersText += `${i + 1}. \`+${num}\`\n`;
  });

  const message =
    `🔄 *${numbers.length}টি নতুন Number পেলেন!*\n\n` +
    `${service.icon} *সার্ভিস:* ${service.name}\n` +
    `${country.flag} *দেশ:* ${country.name}\n` +
    `💵 *প্রতি OTP আয়:* ${otpPrice.toFixed(2)} টাকা\n\n` +
    `📞 *Numbers:*\n${numbersText}\n` +
    `📌 Number টি OTP Group-এ দিন।\n` +
    `OTP আসলে বটে সাথে সাথে দেখাবে ও balance যোগ হবে।`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📨 OTP Group খুলুন', url: OTP_GROUP }],
        [{ text: '🔄 নতুন Number নিন', callback_data: `get_new_numbers:${serviceId}:${countryCode}` }],
        [{ text: '🔙 সার্ভিস লিস্ট', callback_data: 'back_to_services' }]
      ]
    }
  });
});

/******************** BACK TO SERVICES ********************/
bot.action("back_to_services", async (ctx) => {
  try {
    const availableServices = [];
    for (const serviceId in services) {
      const service = services[serviceId];
      const availableCountries = getAvailableCountriesForService(serviceId);
      if (availableCountries.length > 0) {
        let totalNums = 0;
        for (const cc of availableCountries) {
          totalNums += (numbersByCountryService[cc]?.[serviceId]?.length || 0);
        }
        availableServices.push({ serviceId, service, totalNums });
      }
    }

    const serviceButtons = [];
    for (let i = 0; i < availableServices.length; i += 2) {
      const row = [];
      row.push({
        text: `${availableServices[i].service.icon} ${availableServices[i].service.name} (${availableServices[i].totalNums})`,
        callback_data: `select_service:${availableServices[i].serviceId}`
      });
      if (availableServices[i + 1]) {
        row.push({
          text: `${availableServices[i+1].service.icon} ${availableServices[i+1].service.name} (${availableServices[i+1].totalNums})`,
          callback_data: `select_service:${availableServices[i+1].serviceId}`
        });
      }
      serviceButtons.push(row);
    }

    await ctx.editMessageText(
      "🎯 *Service সিলেক্ট করুন*\n\n" +
      "কোন সার্ভিসের জন্য নম্বর নিতে চান?\n" +
      "_(বন্ধনীতে available number সংখ্যা)_",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: serviceButtons }
      }
    );
  } catch (error) {
    console.error("Back to services error:", error);
    await ctx.answerCbQuery("❌ Error", { show_alert: true });
  }
});

/******************** BALANCE ********************/
bot.hears("💰 Balances", async (ctx) => {
  clearUserState(ctx);
  const userId = ctx.from.id.toString();
  const e = getUserEarnings(userId);

  const pendingWithdrawals = withdrawals.filter(
    w => w.userId === userId && w.status === "pending"
  );
  const totalWithdrawn = withdrawals
    .filter(w => w.userId === userId && w.status === "approved")
    .reduce((sum, w) => sum + w.amount, 0);

  await ctx.reply(
    `💰 *আপনার Earnings*\n\n` +
    `💵 *বর্তমান ব্যালেন্স:* ${e.balance.toFixed(2)} টাকা\n` +
    `📈 *মোট আয়:* ${e.totalEarned.toFixed(2)} টাকা\n` +
    `📨 *মোট OTP:* ${e.otpCount || 0} টি\n` +
    `💸 *মোট উত্তোলন:* ${totalWithdrawn.toFixed(2)} টাকা\n` +
    `⏳ *Pending Withdraw:* ${pendingWithdrawals.length} টি\n\n` +
    `📌 *সর্বনিম্ন withdraw:* ${settings.minWithdraw} টাকা\n\n` +
    `💡 OTP আসলে স্বয়ংক্রিয়ভাবে balance যোগ হবে।`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💸 Withdraw করুন", callback_data: "start_withdraw" }],
          [{ text: "📋 Withdraw History", callback_data: "withdraw_history" }]
        ]
      }
    }
  );
});

/******************** WITHDRAW ********************/
bot.hears("💸 Withdraw", async (ctx) => {
  // ← যেকোনো পুরোনো state clear করো
  ctx.session.withdrawState = null;
  ctx.session.withdrawData = null;

  const userId = ctx.from.id.toString();
  const e = getUserEarnings(userId);

  if (!settings.withdrawEnabled) {
    return await ctx.reply("⏸️ *Withdraw বর্তমানে বন্ধ আছে।*\nপরে আবার চেষ্টা করুন।", { parse_mode: "Markdown" });
  }

  if (e.balance < settings.minWithdraw) {
    return await ctx.reply(
      `❌ *Withdraw করার জন্য যথেষ্ট balance নেই।*\n\n` +
      `💵 *আপনার balance:* ${e.balance.toFixed(2)} টাকা\n` +
      `📌 *সর্বনিম্ন withdraw:* ${settings.minWithdraw} টাকা\n\n` +
      `আরো ${(settings.minWithdraw - e.balance).toFixed(2)} টাকা দরকার।`,
      { parse_mode: "Markdown" }
    );
  }

  const methodButtons = (settings.withdrawMethods || ["bKash", "Nagad"]).map(m => ([
    { text: m === "bKash" ? `🟣 ${m}` : `🟠 ${m}`, callback_data: `withdraw_method:${m}` }
  ]));
  methodButtons.push([{ text: "❌ বাতিল", callback_data: "withdraw_cancel" }]);

  await ctx.reply(
    `💸 *Withdraw Request*\n\n` +
    `💵 *আপনার balance:* ${e.balance.toFixed(2)} টাকা\n` +
    `📌 *সর্বনিম্ন:* ${settings.minWithdraw} টাকা\n\n` +
    `কোন method-এ টাকা নিতে চান?`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: methodButtons }
    }
  );
});

bot.action("start_withdraw", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.withdrawState = null;
  ctx.session.withdrawData = null;

  const userId = ctx.from.id.toString();
  const e = getUserEarnings(userId);

  if (!settings.withdrawEnabled) {
    return await ctx.editMessageText("⏸️ *Withdraw বর্তমানে বন্ধ আছে।*", { parse_mode: "Markdown" });
  }
  if (e.balance < settings.minWithdraw) {
    return await ctx.editMessageText(
      `❌ *Balance কম।*\n\n💵 Balance: ${e.balance.toFixed(2)} টাকা\n📌 সর্বনিম্ন: ${settings.minWithdraw} টাকা`,
      { parse_mode: "Markdown" }
    );
  }

  const methodButtons = (settings.withdrawMethods || ["bKash", "Nagad"]).map(m => ([
    { text: m === "bKash" ? `🟣 ${m}` : `🟠 ${m}`, callback_data: `withdraw_method:${m}` }
  ]));
  methodButtons.push([{ text: "❌ বাতিল", callback_data: "withdraw_cancel" }]);
  await ctx.editMessageText(
    `💸 *Withdraw Request*\n\n` +
    `💵 *আপনার balance:* ${e.balance.toFixed(2)} টাকা\n` +
    `📌 *সর্বনিম্ন:* ${settings.minWithdraw} টাকা\n\n` +
    `Payment method সিলেক্ট করুন:`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: methodButtons } }
  );
});

bot.action(/^withdraw_method:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const method = ctx.match[1];
  const icon = method === "bKash" ? "🟣" : "🟠";
  const userId = ctx.from.id.toString();
  const e = getUserEarnings(userId);

  ctx.session.withdrawState = "waiting_amount";
  ctx.session.withdrawData = { method };

  await ctx.editMessageText(
    `${icon} *${method} দিয়ে Withdraw*\n\n` +
    `💰 *আপনার balance:* ${e.balance.toFixed(2)} টাকা\n` +
    `📌 *সর্বনিম্ন:* ${settings.minWithdraw} টাকা\n\n` +
    `কত টাকা তুলতে চান? Amount লিখুন:\n` +
    `উদাহরণ: \`50\`\n\n` +
    `বাতিল করতে /cancel লিখুন`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ বাতিল", callback_data: "withdraw_cancel" }]]
      }
    }
  );
});

bot.action("withdraw_history", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  const userWithdrawals = withdrawals.filter(w => w.userId === userId).slice(-10).reverse();

  let text = "📋 *Withdraw History*\n\n";
  if (userWithdrawals.length === 0) {
    text += "কোনো withdraw request নেই।";
  } else {
    userWithdrawals.forEach((w, i) => {
      const icon = w.status === "approved" ? "✅" : w.status === "rejected" ? "❌" : "⏳";
      text += `${icon} *${w.amount.toFixed(2)} টাকা* - ${w.method}\n`;
      text += `📱 ${w.account} | ${new Date(w.requestedAt).toLocaleDateString('bn-BD')}\n\n`;
    });
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "goto_main_menu" }]] }
  });
});

/******************** OTHER MENU ********************/
bot.hears("⬇️ OTHER", async (ctx) => {
  clearUserState(ctx);
  await ctx.reply(
    "📋 *OTHER OPTIONS*\n\nনিচের অপশন থেকে সিলেক্ট করুন:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          ["💰 Balances", "💸 Withdraw"],
          ["💬 Support", "🏠 Home"]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    }
  );
});

bot.hears(["🏠 Home", "🏠 Main Menu"], async (ctx) => {
  clearUserState(ctx);
  await showMainMenu(ctx);
});

bot.hears("💬 Support", async (ctx) => {
  await ctx.reply(
    "💬 *Support*\n\nযেকোনো সমস্যার জন্য admin-এর সাথে যোগাযোগ করুন।\n\n📌 Admin: @YourAdminUsername",
    { parse_mode: "Markdown" }
  );
});

/******************** HELP ********************/
bot.hears("ℹ️ Help", async (ctx) => {
  await ctx.reply(
    "📖 *Bot Help*\n\n" +
    "• ☎️ *Get Number* - Number নিন\n" +
    "• 📧 *Get Tempmail* - Free temporary email নিন\n" +
    "• 🔐 *2FA* - Facebook/Instagram 2-step code\n" +
    "• 💰 *Balances* - আপনার earnings দেখুন\n" +
    "• 💸 *Withdraw* - টাকা তুলুন\n\n" +
    `📌 সর্বনিম্ন withdraw: ${settings.minWithdraw} টাকা\n\n` +
    "Admin: /adminlogin",
    { parse_mode: "Markdown" }
  );
});



/******************** ADMIN LOGIN ********************/
bot.command("adminlogin", async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');

    if (parts.length < 2) {
      return await ctx.reply("❌ Usage: /adminlogin [password]");
    }

    const password = parts[1];

    if (password === ADMIN_PASSWORD) {
      ctx.session.isAdmin = true;

      if (!admins.includes(ctx.from.id.toString())) {
        admins.push(ctx.from.id.toString());
        saveAdmins();
      }

      await ctx.reply(
        "✅ *Admin Login Successful!*\n\n" +
        "You now have administrator privileges.\n" +
        "Use /admin to access admin panel.",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply("❌ Wrong password. Access denied.");
    }
  } catch (error) {
    console.error("Admin login error:", error);
    await ctx.reply("❌ Error during admin login.");
  }
});

/******************** ADMIN PANEL ********************/
bot.command("admin", async (ctx) => {
  try {
    if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
      return await ctx.reply(
        "❌ *Admin Access Required*\n\n" +
        "Use /adminlogin [password] to login as admin.",
        { parse_mode: "Markdown" }
      );
    }

    const buttons = [
      [
        { text: "📊 Stock Report", callback_data: "admin_stock" },
        { text: "👥 User Stats", callback_data: "admin_users" }
      ],
      [
        { text: "📢 Broadcast", callback_data: "admin_broadcast" },
        { text: "📋 OTP Log", callback_data: "admin_otp_log" }
      ],
      [
        { text: "➕ Add Numbers", callback_data: "admin_add_numbers" },
        { text: "📤 Upload File", callback_data: "admin_upload" }
      ],
      [
        { text: "🗑️ Delete Numbers", callback_data: "admin_delete" },
        { text: "🔧 Manage Services", callback_data: "admin_manage_services" }
      ],
      [
        { text: "🌍 Manage Countries", callback_data: "admin_manage_countries" },
        { text: "⚙️ Settings", callback_data: "admin_settings" }
      ],
      [
        { text: "💰 Country Prices", callback_data: "admin_country_prices" },
        { text: "💸 Withdrawals", callback_data: "admin_withdrawals" }
      ],
      [
        { text: "👛 Balance Management", callback_data: "admin_balance_manage" }
      ]
    ];

    buttons.push([
      { text: "🚪 Logout", callback_data: "admin_logout" }
    ]);

    await ctx.reply(
      "🛠 *Admin Dashboard*\n\n" +
      "Select an option:",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      }
    );

  } catch (error) {
    console.error("Admin command error:", error);
    await ctx.reply("❌ Error accessing admin panel.");
  }
});

/******************** ADMIN STOCK REPORT ********************/
bot.action("admin_stock", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  let report = "📊 *Stock Report*\n\n";
  let totalNumbers = 0;

  for (const countryCode in numbersByCountryService) {
    const country = countries[countryCode];
    const countryName = country ? `${country.flag} ${country.name}` : `Country ${countryCode}`;

    report += `\n${countryName} (+${countryCode}):\n`;

    let countryTotal = 0;

    for (const serviceId in numbersByCountryService[countryCode]) {
      const service = services[serviceId];
      const serviceName = service ? `${service.icon} ${service.name}` : serviceId;
      const count = numbersByCountryService[countryCode][serviceId].length;

      if (count > 0) {
        report += `  ${serviceName}: *${count}*\n`;
        countryTotal += count;
      }
    }

    report += `  *Total:* ${countryTotal}\n`;
    totalNumbers += countryTotal;
  }

  report += `\n📈 *Grand Total:* ${totalNumbers} numbers\n`;
  report += `👥 *Active Users:* ${Object.keys(activeNumbers).length}\n`;
  report += `📨 *OTPs Forwarded:* ${otpLog.length}`;

  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Refresh", callback_data: "admin_stock" }],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

/******************** ADMIN USER STATS (ফিক্সড) ********************/
bot.action("admin_users", async (ctx) => {
  if (!ctx.session.isAdmin) {
    await ctx.answerCbQuery("❌ Admin only");
    return;
  }

  try {
    let message = "👥 *User Statistics*\n\n";

    const totalUsers = Object.keys(users).length;
    const activeUsers = Object.keys(activeNumbers).length;

    message += `📊 *Statistics:*\n`;
    message += `• Total Registered Users: ${totalUsers}\n`;
    message += `• Active Users (with numbers): ${activeUsers}\n`;
    message += `• Total OTPs Delivered: ${otpLog.length}\n\n`;

    if (totalUsers > 0) {
      message += `📋 *Recent Users (last 10):*\n`;

      const sortedUsers = Object.values(users)
        .sort((a, b) => new Date(b.last_active) - new Date(a.last_active))
        .slice(0, 10);

      for (const user of sortedUsers) {
        const timeAgo = getTimeAgo(new Date(user.last_active));
        message += `\n👤 *${user.first_name}* ${user.last_name || ''}\n`;
        message += `🆔 ID: ${user.id}\n`;
        message += `📱 @${user.username || 'no_username'}\n`;
        message += `🕐 Active: ${timeAgo}\n`;
      }
    } else {
      message += `📭 No users yet`;
    }

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Refresh", callback_data: "admin_users" }],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    });
  } catch (error) {
    console.error("Admin users error:", error);
    await ctx.answerCbQuery("❌ Error loading users");
  }
});

/******************** ADMIN OTP LOG ********************/
bot.action("admin_otp_log", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  let message = "📋 *Recent OTP Logs*\n\n";

  if (otpLog.length === 0) {
    message += "No OTPs forwarded yet.";
  } else {
    const recentLogs = otpLog.slice(-10).reverse();
    for (const log of recentLogs) {
      const timeAgo = getTimeAgo(new Date(log.timestamp));
      message += `📞 ${log.phoneNumber} → 👤 ${log.userId}\n`;
      message += `🕐 ${timeAgo}\n\n`;
    }
  }

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Refresh", callback_data: "admin_otp_log" }],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

/******************** ADMIN BROADCAST ********************/
bot.action("admin_broadcast", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_broadcast";

  await ctx.editMessageText(
    "📢 *Broadcast Message*\n\n" +
    "Send the message you want to broadcast to all users.\n\n" +
    "*Note:* This will be sent to all registered users.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN ADD NUMBERS ********************/
bot.action("admin_add_numbers", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_add_numbers";

  await ctx.editMessageText(
    "➕ *Add Numbers Manually*\n\n" +
    "Send numbers in format:\n`[number]|[country code]|[service]`\n\n" +
    "*Examples:*\n" +
    "`8801712345678|880|whatsapp`\n" +
    "`919876543210|91|telegram`\n" +
    "`11234567890|1|facebook`\n\n" +
    "You can send multiple numbers in one message.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN UPLOAD FILE ********************/
bot.action("admin_upload", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_upload";
  ctx.session.adminData = null;

  const serviceButtons = [];
  for (const serviceId in services) {
    const service = services[serviceId];
    serviceButtons.push([
      { 
        text: `${service.icon} ${service.name}`, 
        callback_data: `admin_select_service:${serviceId}` 
      }
    ]);
  }

  serviceButtons.push([{ text: "❌ Cancel", callback_data: "admin_cancel" }]);

  await ctx.editMessageText(
    "📤 *Upload Numbers*\n\n" +
    "Select service for the numbers:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: serviceButtons }
    }
  );
});

bot.action(/^admin_select_service:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const serviceId = ctx.match[1];
  const service = services[serviceId];

  ctx.session.adminState = "waiting_upload_file";
  ctx.session.adminData = { serviceId };

  await ctx.editMessageText(
    `📤 *Upload Numbers for ${service.name}*\n\n` +
    "Send a .txt file with phone numbers.\n\n" +
    "*Format (one per line):*\n" +
    "1. Just number: `8801712345678`\n" +
    "2. With country: `8801712345678|880`\n" +
    "3. With country and service: `8801712345678|880|${serviceId}`\n\n" +
    "*Note:* Country code will be auto-detected if not provided.\n" +
    "*Supported:* .txt files only",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN MANAGE SERVICES ********************/
bot.action("admin_manage_services", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  await ctx.editMessageText(
    "🔧 *Manage Services*\n\n" +
    "Select an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📋 List Services", callback_data: "admin_list_services" },
            { text: "➕ Add Service", callback_data: "admin_add_service" }
          ],
          [
            { text: "🗑️ Delete Service", callback_data: "admin_delete_service" }
          ],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN MANAGE COUNTRIES ********************/
bot.action("admin_manage_countries", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  let countryList = "🌍 *Manage Countries*\n\n";
  countryList += `📊 মোট দেশ: *${Object.keys(countries).length}টি*\n\n`;

  await ctx.editMessageText(countryList, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➕ Add Country", callback_data: "admin_add_country" },
          { text: "📋 List Countries", callback_data: "admin_list_countries" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

bot.action("admin_list_countries", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  let text = "🌍 *Country List*\n\n";
  for (const cc in countries) {
    const c = countries[cc];
    const price = countryPrices[cc] !== undefined ? countryPrices[cc] : (settings.defaultOtpPrice || 0.25);
    text += `${c.flag} *${c.name}* (+${cc}) — ${price.toFixed(2)} TK/OTP\n`;
  }
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_manage_countries" }]] }
  });
});

/******************** ADMIN ADD COUNTRY ********************/
bot.action("admin_add_country", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_add_country";

  await ctx.editMessageText(
    "🌍 *Add New Country*\n\n" +
    "Send in format:\n`[countryCode] [name] [flag]`\n\n" +
    "*Examples:*\n" +
    "`880 Bangladesh 🇧🇩`\n" +
    "`91 India 🇮🇳`\n" +
    "`1 USA 🇺🇸`\n\n" +
    "Note: Country code is dialing code (without +).",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN ADD SERVICE ********************/
bot.action("admin_add_service", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_add_service";

  await ctx.editMessageText(
    "🔧 *Add New Service*\n\n" +
    "Send in format:\n`[service_id] [name] [icon]`\n\n" +
    "*Examples:*\n" +
    "`facebook Facebook 📘`\n" +
    "`gmail Gmail 📧`\n" +
    "`instagram Instagram 📸`\n\n" +
    "Service ID should be lowercase without spaces.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN DELETE SERVICE ********************/
bot.action("admin_delete_service", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const serviceButtons = [];
  for (const serviceId in services) {
    const service = services[serviceId];
    serviceButtons.push([
      { 
        text: `${service.icon} ${service.name}`, 
        callback_data: `admin_delete_service_confirm:${serviceId}` 
      }
    ]);
  }

  serviceButtons.push([{ text: "❌ Cancel", callback_data: "admin_back" }]);

  await ctx.editMessageText(
    "🗑️ *Delete Service*\n\n" +
    "Select service to delete:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: serviceButtons }
    }
  );
});

bot.action(/^admin_delete_service_confirm:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const serviceId = ctx.match[1];
  const service = services[serviceId];

  await ctx.editMessageText(
    `⚠️ *Confirm Deletion*\n\n` +
    `Are you sure you want to delete service *${service.name}*?\n\n` +
    `This will also delete all numbers assigned to this service!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Yes, Delete", callback_data: `admin_delete_service_execute:${serviceId}` },
            { text: "❌ Cancel", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

bot.action(/^admin_delete_service_execute:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const serviceId = ctx.match[1];

  for (const countryCode in numbersByCountryService) {
    if (numbersByCountryService[countryCode][serviceId]) {
      delete numbersByCountryService[countryCode][serviceId];
    }
  }

  delete services[serviceId];

  saveNumbers();
  saveServices();

  await ctx.editMessageText(
    `✅ *Service Deleted Successfully!*\n\n` +
    `Service has been removed.`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Back to Admin", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN LIST SERVICES ********************/
bot.action("admin_list_services", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  let report = "📋 *Services List*\n\n";

  for (const serviceId in services) {
    const service = services[serviceId];
    report += `• ${service.icon} *${service.name}* (ID: \`${serviceId}\`)\n`;
  }

  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

/******************** ADMIN DELETE NUMBERS ********************/
bot.action("admin_delete", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  let report = "❌ *Delete Numbers*\n\n";
  report += "Select which numbers to delete:\n\n";

  const buttons = [];

  for (const countryCode in numbersByCountryService) {
    const country = countries[countryCode];
    const countryName = country ? `${country.flag} ${country.name}` : `Country ${countryCode}`;

    report += `${countryName} (+${countryCode}):\n`;

    for (const serviceId in numbersByCountryService[countryCode]) {
      const service = services[serviceId];
      const count = numbersByCountryService[countryCode][serviceId].length;

      if (count > 0) {
        report += `  ${service?.icon || '📞'} ${service?.name || serviceId}: ${count}\n`;

        buttons.push([
          { 
            text: `🗑️ ${countryCode}/${serviceId} (${count})`, 
            callback_data: `admin_delete_confirm:${countryCode}:${serviceId}` 
          }
        ]);
      }
    }
    report += "\n";
  }

  buttons.push([{ text: "❌ Cancel", callback_data: "admin_cancel" }]);

  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_delete_confirm:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];

  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;

  await ctx.editMessageText(
    `⚠️ *Confirm Deletion*\n\n` +
    `Are you sure you want to delete ${count} numbers?\n` +
    `Country: ${countryCode}\n` +
    `Service: ${services[serviceId]?.name || serviceId}\n\n` +
    `This action cannot be undone!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Yes, Delete", callback_data: `admin_delete_execute:${countryCode}:${serviceId}` },
            { text: "❌ Cancel", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

bot.action(/^admin_delete_execute:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];

  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;

  delete numbersByCountryService[countryCode][serviceId];

  if (Object.keys(numbersByCountryService[countryCode]).length === 0) {
    delete numbersByCountryService[countryCode];
  }

  saveNumbers();

  await ctx.editMessageText(
    `✅ *Deleted Successfully*\n\n` +
    `🗑️ Deleted ${count} numbers\n` +
    `📌 Country: ${countryCode}\n` +
    `🔧 Service: ${services[serviceId]?.name || serviceId}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Back to Admin", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN SETTINGS ********************/
bot.action("admin_settings", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  await ctx.editMessageText(
    "⚙️ *Bot Settings*\n\n" +
    `📞 Number Count: *${settings.defaultNumberCount}*\n` +
    `⏱ Cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `🔐 Verification: *${settings.requireVerification ? "চালু ✅" : "বন্ধ ❌"}*\n` +
    `💵 OTP Price (default): *${(settings.defaultOtpPrice || 0.25).toFixed(2)} টাকা*\n` +
    `💸 Min Withdraw: *${settings.minWithdraw} টাকা*\n` +
    `🏧 Withdraw: *${settings.withdrawEnabled ? "চালু ✅" : "বন্ধ ❌"}*\n\n` +
    "পরিবর্তন করতে বাটন চাপুন:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📞 Number Count", callback_data: "admin_set_count" },
            { text: "⏱ Cooldown", callback_data: "admin_set_cooldown" }
          ],
          [
            { text: `🔐 Verification ${settings.requireVerification ? "বন্ধ করুন" : "চালু করুন"}`, callback_data: "admin_toggle_verification" }
          ],
          [
            { text: "💵 OTP Price সেট করুন", callback_data: "admin_set_default_price" },
            { text: "💸 Min Withdraw সেট করুন", callback_data: "admin_set_min_withdraw" }
          ],
          [
            { text: `🏧 Withdraw ${settings.withdrawEnabled ? "🔴 বন্ধ করুন" : "🟢 চালু করুন"}`, callback_data: "admin_toggle_withdraw" }
          ],
          [
            { text: "🔙 Back", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

bot.action("admin_set_count", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_set_count";

  await ctx.editMessageText(
    `📞 *Set Number Count*\n\n` +
    `Current count: *${settings.defaultNumberCount}*\n\n` +
    `Send the new number count (1-100):`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

bot.action("admin_set_cooldown", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_set_cooldown";

  await ctx.editMessageText(
    `⏱ *Set Cooldown*\n\n` +
    `Current cooldown: *${settings.cooldownSeconds} seconds*\n\n` +
    `Send the new cooldown in seconds (1-3600):`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

bot.action("admin_toggle_verification", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  settings.requireVerification = !settings.requireVerification;
  saveSettings();
  await ctx.answerCbQuery(`✅ Verification ${settings.requireVerification ? "চালু" : "বন্ধ"} করা হয়েছে`);
  // Reuse admin_settings display
  await ctx.editMessageText(
    "⚙️ *Bot Settings*\n\n" +
    `📞 Number Count: *${settings.defaultNumberCount}*\n` +
    `⏱ Cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `🔐 Verification: *${settings.requireVerification ? "চালু ✅" : "বন্ধ ❌"}*\n` +
    `💵 OTP Price (default): *${(settings.defaultOtpPrice || 0.25).toFixed(2)} টাকা*\n` +
    `💸 Min Withdraw: *${settings.minWithdraw} টাকা*\n` +
    `🏧 Withdraw: *${settings.withdrawEnabled ? "চালু ✅" : "বন্ধ ❌"}*\n\n` +
    "পরিবর্তন করতে বাটন চাপুন:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📞 Number Count", callback_data: "admin_set_count" },
            { text: "⏱ Cooldown", callback_data: "admin_set_cooldown" }
          ],
          [
            { text: `🔐 Verification ${settings.requireVerification ? "বন্ধ করুন" : "চালু করুন"}`, callback_data: "admin_toggle_verification" }
          ],
          [
            { text: "💵 OTP Price সেট করুন", callback_data: "admin_set_default_price" },
            { text: "💸 Min Withdraw সেট করুন", callback_data: "admin_set_min_withdraw" }
          ],
          [
            { text: `🏧 Withdraw ${settings.withdrawEnabled ? "🔴 বন্ধ করুন" : "🟢 চালু করুন"}`, callback_data: "admin_toggle_withdraw" }
          ],
          [
            { text: "🔙 Back", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

/******************** ADMIN BACK ********************/
bot.action("admin_back", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.adminState = null;
  ctx.session.adminData = null;

  const buttons = [
    [
      { text: "📊 Stock Report", callback_data: "admin_stock" },
      { text: "👥 User Stats", callback_data: "admin_users" }
    ],
    [
      { text: "📢 Broadcast", callback_data: "admin_broadcast" },
      { text: "📋 OTP Log", callback_data: "admin_otp_log" }
    ],
    [
      { text: "➕ Add Numbers", callback_data: "admin_add_numbers" },
      { text: "📤 Upload File", callback_data: "admin_upload" }
    ],
    [
      { text: "🗑️ Delete Numbers", callback_data: "admin_delete" },
      { text: "🔧 Manage Services", callback_data: "admin_manage_services" }
    ],
    [
      { text: "🌍 Manage Countries", callback_data: "admin_manage_countries" },
      { text: "⚙️ Settings", callback_data: "admin_settings" }
    ],
    [
      { text: "💰 Country Prices", callback_data: "admin_country_prices" },
      { text: "💸 Withdrawals", callback_data: "admin_withdrawals" }
    ],
    [
      { text: "👛 Balance Management", callback_data: "admin_balance_manage" }
    ]
  ];

  buttons.push([
    { text: "🚪 Logout", callback_data: "admin_logout" }
  ]);

  await ctx.editMessageText(
    "🛠 *Admin Dashboard*\n\n" +
    "Select an option:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    }
  );
});

/******************** ADMIN CANCEL ********************/
bot.action("admin_cancel", async (ctx) => {
  ctx.session.adminState = null;
  ctx.session.adminData = null;

  await ctx.editMessageText(
    "❌ *Action Cancelled*\n\n" +
    "Returning to admin panel...",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛠 Back to Admin", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN LOGOUT ********************/
bot.action("admin_logout", async (ctx) => {
  ctx.session.isAdmin = false;
  ctx.session.adminState = null;
  ctx.session.adminData = null;

  await ctx.editMessageText(
    "🚪 *Admin Logged Out*\n\n" +
    "You have been logged out from admin panel.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Back to Main Menu", callback_data: "back_to_services" }]
        ]
      }
    }
  );
});

/******************** CANCEL COMMAND - যেকোনো অবস্থা থেকে বের হতে ********************/
bot.command("cancel", async (ctx) => {
  ctx.session.withdrawState = null;
  ctx.session.withdrawData = null;
  ctx.session.totpState = null;
  ctx.session.totpData = null;
  ctx.session.adminState = null;
  ctx.session.adminData = null;
  await ctx.reply("✅ বাতিল হয়েছে।", {
    reply_markup: {
      keyboard: [
        ["☎️ Get Number", "📧 Get Tempmail"],
        ["🔐 2FA", "💰 Balances"],
        ["💸 Withdraw", "⬇️ OTHER"]
      ],
      resize_keyboard: true
    }
  });
});

/******************** TEXT HANDLER FOR ADMIN + TOTP + WITHDRAW ********************/
bot.on("text", async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text) return;
    const text = ctx.message.text.trim();
    const userId = ctx.from.id.toString();

    // ─── GUARD: keyboard button গুলো hears() handle করবে, text handler না ───
    // যদি text কোনো keyboard button-এর সাথে মিলে যায়, সব state clear করে return
    const KEYBOARD_BUTTONS = [
      "☎️ Get Number", "📞 Get Numbers",
      "📧 Get Tempmail", "📧 Temp Mail",
      "🔐 2FA", "🔐 2FA Codes",
      "💰 Balances",
      "💸 Withdraw",
      "⬇️ OTHER",
      "🏠 Home", "🏠 Main Menu",
      "💬 Support",
      "ℹ️ Help"
    ];

    if (KEYBOARD_BUTTONS.includes(text)) {
      // keyboard button চাপা হয়েছে — সব state reset করো
      ctx.session.withdrawState = null;
      ctx.session.withdrawData = null;
      ctx.session.totpState = null;
      ctx.session.totpData = null;
      ctx.session.adminState = null;
      ctx.session.adminData = null;
      return; // hears() handler নিজেই handle করবে
    }

    // ─── /command গুলোও ignore করো ───
    if (text.startsWith('/')) return;

    // ─── TOTP Secret Key input ───
    if (ctx.session.totpState === "waiting_secret") {
      const secret = text.replace(/\s/g, "").toUpperCase();
      const testResult = generateTOTP(secret);
      if (!testResult) {
        return await ctx.reply(
          "❌ *Secret Key সঠিক নয়!*\n\nBase32 key দিন। উদাহরণ: `JBSWY3DPEHPK3PXP`\n\nবাতিল করতে /cancel",
          { parse_mode: "Markdown" }
        );
      }
      ctx.session.totpData = { ...(ctx.session.totpData || {}), secret };
      ctx.session.totpState = "waiting_label";
      return await ctx.reply(
        `✅ *Key সঠিক!* Test Code: \`${testResult.token}\`\n\nএই account-এর একটি নাম দিন:\nউদাহরণ: \`MyFacebook\``,
        { parse_mode: "Markdown" }
      );
    }

    if (ctx.session.totpState === "waiting_label") {
      const label = text.substring(0, 30);
      const { service, secret } = ctx.session.totpData;
      if (!totpSecrets[userId]) totpSecrets[userId] = [];
      if (totpSecrets[userId].length >= 10) totpSecrets[userId].shift();
      const index = totpSecrets[userId].length;
      totpSecrets[userId].push({ label, service, secret, addedAt: new Date().toISOString() });
      saveTotpSecrets();
      ctx.session.totpState = null;
      ctx.session.totpData = null;
      const result = generateTOTP(secret);
      const icon = service === "facebook" ? "📘" : service === "instagram" ? "📸" : service === "google" ? "🔍" : "⚙️";
      return await ctx.reply(
        `✅ *${label} - সেভ হয়েছে!*\n\n${icon} *Code:* \`${result?.token || "Error"}\`\n⏰ ${result?.timeRemaining || 0} সেকেন্ড বাকি`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 নতুন Code", callback_data: `totp_generate:${index}` }],
              [{ text: "📋 সব Keys", callback_data: "totp_list" }]
            ]
          }
        }
      );
    }

    // ─── WITHDRAW: amount input ───
    if (ctx.session.withdrawState === "waiting_amount") {
      const amount = parseFloat(text);
      const userEarnings = getUserEarnings(userId);

      if (isNaN(amount) || amount <= 0) {
        return await ctx.reply(
          "❌ *সঠিক amount দিন!*\n\nউদাহরণ: `50`\n\nবাতিল করতে /cancel",
          { parse_mode: "Markdown" }
        );
      }

      if (amount < settings.minWithdraw) {
        return await ctx.reply(
          `❌ *সর্বনিম্ন ${settings.minWithdraw} টাকা তুলতে হবে।*\n\nআপনি ${amount.toFixed(2)} টাকা দিয়েছেন।`,
          { parse_mode: "Markdown" }
        );
      }

      if (amount > userEarnings.balance) {
        return await ctx.reply(
          `❌ *আপনার balance কম।*\n\n💰 Balance: ${userEarnings.balance.toFixed(2)} টাকা\nআপনি চেয়েছেন: ${amount.toFixed(2)} টাকা`,
          { parse_mode: "Markdown" }
        );
      }

      const { method } = ctx.session.withdrawData;
      ctx.session.withdrawData = { method, amount };
      ctx.session.withdrawState = "waiting_account";

      const icon = method === "bKash" ? "🟣" : "🟠";
      return await ctx.reply(
        `${icon} *${method} নম্বর লিখুন*\n\n` +
        `💵 Amount: ${amount.toFixed(2)} টাকা\n\n` +
        `আপনার ${method} নম্বর পাঠান:\n` +
        `উদাহরণ: \`01712345678\`\n\n` +
        `বাতিল করতে /cancel লিখুন`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ বাতিল", callback_data: "withdraw_cancel" }]]
          }
        }
      );
    }

    // ─── WITHDRAW account number input ───
    if (ctx.session.withdrawState === "waiting_account") {
      const account = text;

      // Phone number format validate করি (01XXXXXXXXX)
      if (!/^01[3-9]\d{8}$/.test(account)) {
        return await ctx.reply(
          "❌ *সঠিক নম্বর দিন!*\n\nবাংলাদেশি নম্বর দিন: `01XXXXXXXXX`\n\nবাতিল করতে /cancel",
          { parse_mode: "Markdown" }
        );
      }

      const userEarnings = getUserEarnings(userId);
      const { method, amount } = ctx.session.withdrawData;

      if (userEarnings.balance < amount) {
        ctx.session.withdrawState = null;
        ctx.session.withdrawData = null;
        return await ctx.reply(
          `❌ *Balance পরিবর্তন হয়েছে।* আবার চেষ্টা করুন।`,
          { parse_mode: "Markdown" }
        );
      }

      ctx.session.withdrawData = { method, account, amount };
      ctx.session.withdrawState = "confirm";

      const icon = method === "bKash" ? "🟣" : "🟠";
      return await ctx.reply(
        `✅ *Withdraw Confirm করুন*\n\n` +
        `${icon} *Method:* ${method}\n` +
        `📱 *Account:* ${account}\n` +
        `💵 *Amount:* ${amount.toFixed(2)} টাকা\n\n` +
        `সব তথ্য সঠিক আছে?`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ হ্যাঁ, Withdraw করুন", callback_data: "withdraw_confirm" },
                { text: "❌ বাতিল", callback_data: "withdraw_cancel" }
              ]
            ]
          }
        }
      );
    }

    // ─── Admin-only states ───
    if (!ctx.session.isAdmin || !ctx.session.adminState) return;
    const adminState = ctx.session.adminState;

    if (adminState === "waiting_set_count") {
      const count = parseInt(text);
      if (isNaN(count) || count < 1 || count > 100) {
        return await ctx.reply("❌ Please send a valid number between 1 and 100.");
      }

      settings.defaultNumberCount = count;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *Number Count সেট হয়েছে: ${count}*`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Settings-এ ফিরুন", callback_data: "admin_settings" }]] } }
      );

    } else if (adminState === "waiting_set_cooldown") {
      const seconds = parseInt(text);
      if (isNaN(seconds) || seconds < 1 || seconds > 3600) {
        return await ctx.reply("❌ Please send a valid number between 1 and 3600.");
      }

      settings.cooldownSeconds = seconds;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *Cooldown সেট হয়েছে: ${seconds} seconds*`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Settings-এ ফিরুন", callback_data: "admin_settings" }]] } }
      );

    } else if (adminState === "waiting_broadcast") {
      let sent = 0;
      let failed = 0;

      for (const userId in users) {
        try {
          await ctx.telegram.sendMessage(userId, text, { parse_mode: "Markdown" });
          sent++;
        } catch (error) {
          failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      ctx.session.adminState = null;
      await ctx.reply(
        `📢 *Broadcast Complete!*\n\n` +
        `✅ Sent: ${sent} users\n` +
        `❌ Failed: ${failed} users`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_back" }]] } }
      );

    } else if (adminState === "waiting_add_numbers") {
      const lines = text.split('\n');
      let added = 0;
      let failed = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        let number, countryCode, service;

        if (trimmedLine.includes("|")) {
          const parts = trimmedLine.split("|");
          if (parts.length >= 3) {
            number = parts[0].trim();
            countryCode = parts[1].trim();
            service = parts[2].trim();
          } else if (parts.length === 2) {
            number = parts[0].trim();
            countryCode = parts[1].trim();
            service = "other";
          } else {
            failed++;
            continue;
          }
        } else {
          number = trimmedLine;
          countryCode = getCountryCodeFromNumber(number);
          service = "other";
        }

        if (!/^\d{10,15}$/.test(number)) {
          failed++;
          continue;
        }

        if (!countryCode) {
          failed++;
          continue;
        }

        numbersByCountryService[countryCode] = numbersByCountryService[countryCode] || {};
        numbersByCountryService[countryCode][service] = numbersByCountryService[countryCode][service] || [];

        if (!numbersByCountryService[countryCode][service].includes(number)) {
          numbersByCountryService[countryCode][service].push(number);
          added++;
        } else {
          failed++;
        }
      }

      saveNumbers();

      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *Numbers Added!*\n\n` +
        `✅ Added: ${added}\n` +
        `❌ Failed: ${failed}`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "admin_back" }]] } }
      );

    } else if (adminState === "waiting_add_country") {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 3) {
        const countryCode = parts[0];
        const countryName = parts.slice(1, -1).join(" ");
        const flag = parts[parts.length - 1];

        countries[countryCode] = {
          name: countryName,
          flag: flag
        };

        saveCountries();

        ctx.session.adminState = null;
        await ctx.reply(
          `✅ *Country যোগ হয়েছে!*\n\n` +
          `📌 *Code:* +${countryCode}\n` +
          `🏳️ *Name:* ${countryName}\n` +
          `${flag} *Flag:* ${flag}`,
          { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Countries-এ ফিরুন", callback_data: "admin_manage_countries" }]] } }
        );
      } else {
        await ctx.reply("❌ Invalid format. Use: `[code] [name] [flag]`", { parse_mode: "Markdown" });
      }

    } else if (adminState === "waiting_country_price") {
      const lines = text.trim().split('\n');
      let updated = 0, failed = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const cc = parts[0].trim();
          const price = parseFloat(parts[1]);
          if (!isNaN(price) && price >= 0) {
            countryPrices[cc] = price;
            updated++;
          } else { failed++; }
        } else { failed++; }
      }
      saveCountryPrices();
      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *Prices Updated!*\n\n✅ Updated: ${updated}\n❌ Failed: ${failed}`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Country Prices", callback_data: "admin_country_prices" }]] } }
      );

    } else if (adminState === "waiting_default_price") {
      const price = parseFloat(text.trim());
      if (isNaN(price) || price < 0) {
        return await ctx.reply("❌ সঠিক amount দিন। উদা: `0.50`", { parse_mode: "Markdown" });
      }
      settings.defaultOtpPrice = price;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *Default OTP Price সেট হয়েছে: ${price.toFixed(2)} টাকা*`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Settings-এ ফিরুন", callback_data: "admin_settings" }]] } }
      );

    } else if (adminState === "waiting_min_withdraw") {
      const amount = parseFloat(text.trim());
      if (isNaN(amount) || amount < 1) {
        return await ctx.reply("❌ সঠিক amount দিন। উদা: `50`", { parse_mode: "Markdown" });
      }
      settings.minWithdraw = amount;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *Min Withdraw সেট হয়েছে: ${amount} টাকা*`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Settings-এ ফিরুন", callback_data: "admin_settings" }]] } }
      );

    } else if (adminState === "waiting_add_balance") {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 2) {
        const targetId = parts[0];
        const amount = parseFloat(parts[1]);
        if (isNaN(amount) || amount <= 0) return await ctx.reply("❌ সঠিক amount দিন।");
        const targetEarnings = getUserEarnings(targetId);
        targetEarnings.balance = parseFloat((targetEarnings.balance + amount).toFixed(2));
        targetEarnings.totalEarned = parseFloat((targetEarnings.totalEarned + amount).toFixed(2));
        saveEarnings();
        ctx.session.adminState = null;
        await ctx.reply(
          `✅ *${targetId}-এ ${amount.toFixed(2)} টাকা যোগ হয়েছে।*\nনতুন Balance: ${targetEarnings.balance.toFixed(2)} টাকা`,
          { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Balance Management", callback_data: "admin_balance_manage" }]] } }
        );
        try { await ctx.telegram.sendMessage(targetId, `✅ *Admin আপনার account-এ ${amount.toFixed(2)} টাকা যোগ করেছে!*\n💰 নতুন Balance: ${targetEarnings.balance.toFixed(2)} টাকা`, { parse_mode: "Markdown" }); } catch(e){}
      } else { await ctx.reply("❌ Format: `[user_id] [amount]`", { parse_mode: "Markdown" }); }

    } else if (adminState === "waiting_deduct_balance") {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 2) {
        const targetId = parts[0];
        const amount = parseFloat(parts[1]);
        if (isNaN(amount) || amount <= 0) return await ctx.reply("❌ সঠিক amount দিন।");
        const targetEarnings = getUserEarnings(targetId);
        targetEarnings.balance = Math.max(0, parseFloat((targetEarnings.balance - amount).toFixed(2)));
        saveEarnings();
        ctx.session.adminState = null;
        await ctx.reply(
          `✅ *${targetId} থেকে ${amount.toFixed(2)} টাকা কাটা হয়েছে।*\nনতুন Balance: ${targetEarnings.balance.toFixed(2)} টাকা`,
          { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Balance Management", callback_data: "admin_balance_manage" }]] } }
        );
      } else { await ctx.reply("❌ Format: `[user_id] [amount]`", { parse_mode: "Markdown" }); }

    } else if (adminState === "waiting_reset_balance") {
      const targetId = text.trim();
      const targetEarnings = getUserEarnings(targetId);
      targetEarnings.balance = 0;
      saveEarnings();
      ctx.session.adminState = null;
      await ctx.reply(
        `✅ *${targetId}-এর balance 0 করা হয়েছে।*`,
        { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Balance Management", callback_data: "admin_balance_manage" }]] } }
      );

    } else if (adminState === "waiting_add_service") {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 3) {
        const serviceId = parts[0].toLowerCase();
        const serviceName = parts.slice(1, -1).join(" ");
        const icon = parts[parts.length - 1];

        services[serviceId] = { name: serviceName, icon: icon };
        saveServices();
        ctx.session.adminState = null;
        await ctx.reply(
          `✅ *Service যোগ হয়েছে!*\n\n📌 ID: \`${serviceId}\`\n🔧 Name: ${serviceName}\n${icon} Icon: ${icon}`,
          { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Services-এ ফিরুন", callback_data: "admin_manage_services" }]] } }
        );
      } else {
        await ctx.reply("❌ Invalid format. Use: `[id] [name] [icon]`", { parse_mode: "Markdown" });
      }
    }
  } catch (error) {
    console.error("Text handler error:", error);
  }
});

/******************** FILE UPLOAD HANDLER ********************/
bot.on("document", async (ctx) => {
  try {
    if (!ctx.session.isAdmin || ctx.session.adminState !== "waiting_upload_file") return;

    const document = ctx.message.document;

    if (!document.file_name.toLowerCase().endsWith('.txt')) {
      await ctx.reply("❌ Please send only .txt files.");
      return;
    }

    await ctx.reply("📥 Downloading and processing file...");

    try {
      const fileLink = await ctx.telegram.getFileLink(document.file_id);

      const fileContent = await new Promise((resolve, reject) => {
        https.get(fileLink.href, (response) => {
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => {
            resolve(data);
          });
        }).on('error', reject);
      });

      const serviceId = ctx.session.adminData?.serviceId;
      if (!serviceId) {
        await ctx.reply("❌ Service not selected. Please try again.");
        return;
      }

      const service = services[serviceId];
      if (!service) {
        await ctx.reply("❌ Service not found.");
        return;
      }

      const lines = fileContent.split(/\r?\n/);
      let added = 0;
      let skipped = 0;
      let invalid = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        let number, countryCode, serviceFromFile;

        if (trimmedLine.includes("|")) {
          const parts = trimmedLine.split("|");
          if (parts.length >= 3) {
            number = parts[0].trim();
            countryCode = parts[1].trim();
            serviceFromFile = parts[2].trim();
          } else if (parts.length === 2) {
            number = parts[0].trim();
            countryCode = parts[1].trim();
            serviceFromFile = serviceId;
          } else {
            invalid++;
            continue;
          }
        } else {
          number = trimmedLine;
          countryCode = getCountryCodeFromNumber(number);
          serviceFromFile = serviceId;
        }

        if (!/^\d{10,15}$/.test(number)) {
          invalid++;
          continue;
        }

        if (!countryCode) {
          invalid++;
          continue;
        }

        if (!countries[countryCode]) {
          countries[countryCode] = {
            name: `Country ${countryCode}`,
            flag: "🏳️"
          };
        }

        numbersByCountryService[countryCode] = numbersByCountryService[countryCode] || {};
        numbersByCountryService[countryCode][serviceFromFile] = numbersByCountryService[countryCode][serviceFromFile] || [];

        if (!numbersByCountryService[countryCode][serviceFromFile].includes(number)) {
          numbersByCountryService[countryCode][serviceFromFile].push(number);
          added++;
        } else {
          skipped++;
        }
      }

      saveCountries();
      saveNumbers();

      ctx.session.adminState = null;
      ctx.session.adminData = null;

      await ctx.reply(
        `✅ *File Upload Complete!*\n\n` +
        `📁 File: ${document.file_name}\n` +
        `🔧 Service: ${service.name}\n\n` +
        `📊 Results:\n` +
        `✅ Added: *${added}* numbers\n` +
        `↪️ Skipped (duplicates): *${skipped}*\n` +
        `❌ Invalid: *${invalid}*\n\n` +
        `📈 Total numbers now: ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length}`,
        { parse_mode: "Markdown" }
      );

    } catch (error) {
      console.error("File processing error:", error);
      await ctx.reply("❌ Error processing file. Please try again with a valid .txt file.");
    }

  } catch (error) {
    console.error("File upload error:", error);
    await ctx.reply("❌ Error uploading file. Please try again.");
  }
});

/******************** TEMP MAIL FEATURE ********************/
bot.hears(["📧 Temp Mail", "📧 Get Tempmail"], async (ctx) => {
  clearUserState(ctx);
  const userId = ctx.from.id.toString();

  await ctx.reply(
    "📧 *Temporary Email*\n\n" +
    "Choose an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🆕 নতুন Email তৈরি করুন", callback_data: "tempmail_create" }],
          [{ text: "📬 Inbox চেক করুন", callback_data: "tempmail_inbox" }],
          [{ text: "🗑️ Email Delete করুন", callback_data: "tempmail_delete" }]
        ]
      }
    }
  );
});

bot.action("tempmail_create", async (ctx) => {
  try {
    await ctx.answerCbQuery("⏳ Email তৈরি হচ্ছে...");
    await ctx.editMessageText("⏳ *নতুন Email তৈরি হচ্ছে...*\nঅনুগ্রহ করে অপেক্ষা করুন।", { parse_mode: "Markdown" });

    const userId = ctx.from.id.toString();
    const domain = await getMailTmDomain();
    const username = generateRandomString(10);
    const address = `${username}@${domain}`;
    const password = generateRandomString(12);

    const createRes = await createTempMailAccount(address, password);
    if (createRes.status !== 201) {
      return await ctx.editMessageText(
        `❌ *Email তৈরি করতে সমস্যা হয়েছে*\n\nStatus: ${createRes.status}\nআবার চেষ্টা করুন।`,
        { parse_mode: "Markdown" }
      );
    }

    const tokenRes = await getTempMailToken(address, password);
    if (tokenRes.status !== 200) {
      return await ctx.editMessageText("❌ *Login করতে সমস্যা হয়েছে।* আবার চেষ্টা করুন।", { parse_mode: "Markdown" });
    }

    const token = tokenRes.data.token;
    tempMails[userId] = { address, password, token, createdAt: new Date().toISOString() };
    saveTempMails();

    await ctx.editMessageText(
      `✅ *Temporary Email তৈরি হয়েছে!*\n\n` +
      `📧 *Email:*\n\`${address}\`\n\n` +
      `🔑 *Password:* \`${password}\`\n\n` +
      `⏰ *Note:* এই email সাময়িক। Inbox চেক করতে নিচের বাটন চাপুন।`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📬 Inbox চেক করুন", callback_data: "tempmail_inbox" }],
            [{ text: "🔄 নতুন Email নিন", callback_data: "tempmail_create" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Temp mail create error:", error);
    await ctx.editMessageText("❌ *Error:* " + error.message, { parse_mode: "Markdown" });
  }
});

bot.action("tempmail_inbox", async (ctx) => {
  try {
    await ctx.answerCbQuery("📬 Inbox লোড হচ্ছে...");
    const userId = ctx.from.id.toString();

    if (!tempMails[userId]) {
      return await ctx.editMessageText(
        "❌ *আপনার কোনো Email নেই।*\n\nপ্রথমে নতুন Email তৈরি করুন।",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🆕 নতুন Email তৈরি করুন", callback_data: "tempmail_create" }]
            ]
          }
        }
      );
    }

    const { address, token } = tempMails[userId];

    // Token refresh করুন
    const tokenRes = await getTempMailToken(address, tempMails[userId].password);
    const freshToken = tokenRes.status === 200 ? tokenRes.data.token : token;
    if (tokenRes.status === 200) {
      tempMails[userId].token = freshToken;
      saveTempMails();
    }

    const messagesRes = await getTempMailMessages(freshToken);

    if (messagesRes.status !== 200) {
      return await ctx.editMessageText(
        "❌ *Inbox লোড করতে সমস্যা হয়েছে।* আবার চেষ্টা করুন।",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Retry", callback_data: "tempmail_inbox" }]
            ]
          }
        }
      );
    }

    const messages = messagesRes.data["hydra:member"] || [];

    let text = `📬 *Inbox: ${address}*\n\n`;

    if (messages.length === 0) {
      text += "📭 *কোনো email আসেনি।*\n\nEmail পাঠানোর পর ৩০ সেকেন্ড অপেক্ষা করুন।";
    } else {
      text += `📨 *${messages.length}টি Email আছে:*\n\n`;
      messages.slice(0, 5).forEach((msg, i) => {
        const from = msg.from?.address || "Unknown";
        const subject = msg.subject || "(No Subject)";
        const intro = msg.intro || "";
        text += `${i + 1}. 📩 *From:* ${from}\n   *Subject:* ${subject}\n   ${intro.substring(0, 80)}${intro.length > 80 ? "..." : ""}\n\n`;
      });
    }

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Refresh", callback_data: "tempmail_inbox" }],
          [{ text: "📧 Email Address দেখুন", callback_data: "tempmail_showaddress" }],
          [{ text: "🔄 নতুন Email নিন", callback_data: "tempmail_create" }]
        ]
      }
    });
  } catch (error) {
    console.error("Temp mail inbox error:", error);
    await ctx.editMessageText("❌ Error: " + error.message, { parse_mode: "Markdown" });
  }
});

bot.action("tempmail_showaddress", async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!tempMails[userId]) return await ctx.answerCbQuery("❌ কোনো email নেই");
  const { address, password } = tempMails[userId];
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📧 *আপনার Temp Email:*\n\n` +
    `Email: \`${address}\`\n` +
    `Password: \`${password}\``,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📬 Inbox চেক করুন", callback_data: "tempmail_inbox" }],
          [{ text: "🔄 নতুন Email নিন", callback_data: "tempmail_create" }]
        ]
      }
    }
  );
});

bot.action("tempmail_delete", async (ctx) => {
  const userId = ctx.from.id.toString();
  await ctx.answerCbQuery();
  if (tempMails[userId]) {
    delete tempMails[userId];
    saveTempMails();
    await ctx.editMessageText("✅ *Email Delete করা হয়েছে।*", { parse_mode: "Markdown" });
  } else {
    await ctx.editMessageText("❌ *কোনো Email নেই।*", { parse_mode: "Markdown" });
  }
});

/******************** 2FA TOTP FEATURE ********************/
bot.hears(["🔐 2FA Codes", "🔐 2FA"], async (ctx) => {
  clearUserState(ctx);
  await ctx.reply(
    "🔐 *2-Step Verification Codes*\n\n" +
    "Secret Key দিয়ে Facebook, Instagram সহ যেকোনো সাইটের 2FA code generate করুন।\n\n" +
    "Choose an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📘 Facebook 2FA", callback_data: "totp_service:facebook" }],
          [{ text: "📸 Instagram 2FA", callback_data: "totp_service:instagram" }],
          [{ text: "🔍 Google 2FA", callback_data: "totp_service:google" }],
          [{ text: "⚙️ Other Service 2FA", callback_data: "totp_service:other" }],
          [{ text: "📋 আমার Saved Keys", callback_data: "totp_list" }]
        ]
      }
    }
  );
});

bot.action(/^totp_service:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const service = ctx.match[1];
  const icons = { facebook: "📘", instagram: "📸", google: "🔍", other: "⚙️" };
  const names = { facebook: "Facebook", instagram: "Instagram", google: "Google", other: "Other" };

  ctx.session.totpState = "waiting_secret";
  ctx.session.totpData = { service };

  await ctx.editMessageText(
    `${icons[service] || "🔐"} *${names[service] || service} 2FA Setup*\n\n` +
    `আপনার *Secret Key* পাঠান:\n\n` +
    `📌 *কোথায় পাবেন Secret Key?*\n` +
    `• Facebook → Settings → Security → Two-Factor → Authenticator App → "Setup Key" বা QR code\n` +
    `• Instagram → Settings → Security → Two-Factor → Authentication App → এর পর manual key দেখাবে\n\n` +
    `🔑 Key টি এরকম দেখতে: \`JBSWY3DPEHPK3PXP\`\n\n` +
    `Key পাঠান:`,
    { parse_mode: "Markdown" }
  );
});

bot.action("totp_list", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  const userSecrets = totpSecrets[userId] || [];

  if (userSecrets.length === 0) {
    return await ctx.editMessageText(
      "📋 *কোনো Saved Key নেই।*\n\nনতুন key যোগ করতে সার্ভিস সিলেক্ট করুন।",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back", callback_data: "totp_back" }]
          ]
        }
      }
    );
  }

  const buttons = userSecrets.map((s, i) => [{
    text: `${s.service === "facebook" ? "📘" : s.service === "instagram" ? "📸" : s.service === "google" ? "🔍" : "⚙️"} ${s.label}`,
    callback_data: `totp_generate:${i}`
  }]);
  buttons.push([{ text: "🗑️ সব Key মুছে ফেলুন", callback_data: "totp_delete_all" }]);
  buttons.push([{ text: "🔙 Back", callback_data: "totp_back" }]);

  await ctx.editMessageText(
    `📋 *আপনার Saved 2FA Keys (${userSecrets.length}টি):*\n\nCode generate করতে নাম চাপুন:`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    }
  );
});

bot.action(/^totp_generate:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  const index = parseInt(ctx.match[1]);
  const userSecrets = totpSecrets[userId] || [];

  if (index >= userSecrets.length) {
    return await ctx.editMessageText("❌ Key পাওয়া যায়নি।", { parse_mode: "Markdown" });
  }

  const entry = userSecrets[index];
  const result = generateTOTP(entry.secret);

  if (!result) {
    return await ctx.editMessageText(
      "❌ *Invalid Secret Key!*\n\nKey টি সঠিক নয়। নতুন key দিয়ে আবার চেষ্টা করুন।",
      { parse_mode: "Markdown" }
    );
  }

  const serviceIcon = entry.service === "facebook" ? "📘" : entry.service === "instagram" ? "📸" : entry.service === "google" ? "🔍" : "⚙️";

  await ctx.editMessageText(
    `${serviceIcon} *${entry.label} - 2FA Code*\n\n` +
    `🔑 *Code:* \`${result.token}\`\n\n` +
    `⏰ *${result.timeRemaining} সেকেন্ড বাকি আছে*\n\n` +
    `📋 Code টি copy করে সাইটে দিন।`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 নতুন Code নিন", callback_data: `totp_generate:${index}` }],
          [{ text: "📋 সব Keys", callback_data: "totp_list" }]
        ]
      }
    }
  );
});

bot.action("totp_delete_all", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  delete totpSecrets[userId];
  saveTotpSecrets();
  await ctx.editMessageText("✅ *সব Keys মুছে ফেলা হয়েছে।*", { parse_mode: "Markdown" });
});

bot.action("totp_back", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🔐 *2-Step Verification Codes*\n\nService সিলেক্ট করুন:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📘 Facebook 2FA", callback_data: "totp_service:facebook" }],
          [{ text: "📸 Instagram 2FA", callback_data: "totp_service:instagram" }],
          [{ text: "🔍 Google 2FA", callback_data: "totp_service:google" }],
          [{ text: "⚙️ Other Service 2FA", callback_data: "totp_service:other" }],
          [{ text: "📋 আমার Saved Keys", callback_data: "totp_list" }]
        ]
      }
    }
  );
});

/******************** OTP GROUP MONITORING ********************/
bot.on("message", async (ctx) => {
  try {
    // শুধু OTP group-এর message নেব
    const chatId = ctx.chat.id;
    const isOtpGroup =
      chatId === OTP_GROUP_ID ||
      chatId === Number(OTP_GROUP_ID) ||
      chatId.toString() === OTP_GROUP_ID.toString();
    if (!isOtpGroup) return;

    const messageText = ctx.message.text || ctx.message.caption || '';
    const messageId = ctx.message.message_id;
    if (!messageText) return;

    console.log(`📨 OTP Group [${messageId}]: ${messageText.substring(0, 80)}`);

    // ১. কোন active number-এর জন্য এই message?
    const matchedNumber = findMatchingActiveNumber(messageText);
    if (!matchedNumber) {
      console.log('⚠️ No matching active number found');
      return;
    }

    console.log(`✅ Matched number: ${matchedNumber}`);

    const userData = activeNumbers[matchedNumber];
    const userId   = userData.userId;
    const countryCode = userData.countryCode || '';

    // ২. OTP code বের করি (যদি থাকে)
    const otpCode = extractOTPCode(messageText);

    // ৩. User-কে বটের ভেতরে সুন্দরভাবে পাঠাই
    const earned      = addEarning(userId, countryCode);
    const userBalance = getUserEarnings(userId).balance;
    const service     = services[userData.service] || { icon: '📱', name: userData.service };
    const country     = countries[countryCode] || { flag: '🌍', name: countryCode };

    let notifyText =
      `📨 *OTP এসেছে!*\n\n` +
      `${service.icon} *সার্ভিস:* ${service.name}\n` +
      `${country.flag} *দেশ:* ${country.name}\n` +
      `📞 *Number:* \`+${matchedNumber}\`\n`;

    if (otpCode) {
      notifyText += `\n🔑 *OTP Code:* \`${otpCode}\`\n`;
    }

    notifyText +=
      `\n💵 *+${earned.toFixed(2)} টাকা যোগ হয়েছে!*\n` +
      `💰 *বর্তমান ব্যালেন্স: ${userBalance.toFixed(2)} টাকা*`;

    // user-কে notify পাঠাই
    await ctx.telegram.sendMessage(userId, notifyText, { parse_mode: 'Markdown' });

    // ৪. OTP group-এর original message-ও forward করি (পুরো context দেখতে)
    await ctx.telegram.forwardMessage(userId, OTP_GROUP_ID, messageId);

    // ৫. Log সেভ করি
    otpLog.push({
      phoneNumber: matchedNumber,
      userId,
      countryCode,
      service: userData.service,
      otpCode: otpCode || null,
      earned,
      messageId,
      delivered: true,
      timestamp: new Date().toISOString()
    });
    saveOTPLog();

    console.log(`✅ OTP delivered to user ${userId} | Earned: ${earned} TK`);

  } catch (error) {
    console.error('OTP monitoring error:', error);
  }
});

/******************** WITHDRAW CONFIRM/CANCEL ********************/
bot.action("withdraw_confirm", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  if (ctx.session.withdrawState !== "confirm") return;

  const { method, account, amount } = ctx.session.withdrawData;
  const userEarnings = getUserEarnings(userId);

  if (userEarnings.balance < amount) {
    ctx.session.withdrawState = null;
    ctx.session.withdrawData = null;
    return await ctx.editMessageText("❌ Balance পরিবর্তন হয়েছে। আবার চেষ্টা করুন।", { parse_mode: "Markdown" });
  }

  // Deduct balance
  userEarnings.balance = parseFloat((userEarnings.balance - amount).toFixed(2));
  saveEarnings();

  const withdrawId = Date.now().toString();
  withdrawals.push({
    id: withdrawId,
    userId,
    userName: ctx.from.first_name || "User",
    userUsername: ctx.from.username || "",
    amount,
    method,
    account,
    status: "pending",
    requestedAt: new Date().toISOString(),
    processedAt: null
  });
  saveWithdrawals();

  ctx.session.withdrawState = null;
  ctx.session.withdrawData = null;

  await ctx.editMessageText(
    `✅ *Withdraw Request সফলভাবে জমা হয়েছে!*\n\n` +
    `💳 Method: ${method}\n` +
    `📱 Account: ${account}\n` +
    `💵 Amount: ${amount.toFixed(2)} টাকা\n\n` +
    `⏳ Admin অনুমোদনের পর পেমেন্ট পাবেন।`,
    { parse_mode: "Markdown" }
  );

  // Notify all admins
  for (const adminId of admins) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `🔔 *নতুন Withdraw Request!*\n\n` +
        `👤 User: ${ctx.from.first_name} (@${ctx.from.username || "N/A"})\n` +
        `🆔 ID: ${userId}\n` +
        `💳 Method: ${method}\n` +
        `📱 Account: ${account}\n` +
        `💵 Amount: ${amount.toFixed(2)} টাকা`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Approve", callback_data: `wadmin_approve:${withdrawId}` },
                { text: "❌ Reject", callback_data: `wadmin_reject:${withdrawId}` }
              ]
            ]
          }
        }
      );
    } catch (e) {}
  }
});

bot.action("withdraw_cancel", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.withdrawState = null;
  ctx.session.withdrawData = null;
  await ctx.editMessageText(
    "❌ *Withdraw বাতিল হয়েছে।*\n\nআবার চেষ্টা করতে 💸 Withdraw বাটন চাপুন।",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "goto_main_menu" }]] }
    }
  );
});

bot.action("goto_main_menu", async (ctx) => {
  await ctx.answerCbQuery();
  clearUserState(ctx);
  await showMainMenu(ctx);
});

/******************** ADMIN WITHDRAW APPROVE/REJECT ********************/
bot.action(/^wadmin_approve:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) return await ctx.answerCbQuery("❌ Admin only");
  await ctx.answerCbQuery("✅ Approving...");

  const withdrawId = ctx.match[1];
  const w = withdrawals.find(w => w.id === withdrawId);
  if (!w) return await ctx.editMessageText("❌ Request পাওয়া যায়নি।");

  if (w.status !== "pending") return await ctx.editMessageText(`⚠️ এই request ইতিমধ্যে ${w.status}।`);

  w.status = "approved";
  w.processedAt = new Date().toISOString();
  saveWithdrawals();

  await ctx.editMessageText(
    `✅ *Withdraw Approved!*\n\n` +
    `👤 ${w.userName}\n💵 ${w.amount.toFixed(2)} টাকা → ${w.method}\n📱 ${w.account}`,
    { parse_mode: "Markdown" }
  );

  try {
    await ctx.telegram.sendMessage(
      w.userId,
      `✅ *আপনার Withdraw Approved হয়েছে!*\n\n` +
      `💵 Amount: ${w.amount.toFixed(2)} টাকা\n` +
      `💳 Method: ${w.method}\n` +
      `📱 Account: ${w.account}\n\n` +
      `শীঘ্রই পেমেন্ট পাবেন।`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {}
});

bot.action(/^wadmin_reject:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) return await ctx.answerCbQuery("❌ Admin only");
  await ctx.answerCbQuery("❌ Rejecting...");

  const withdrawId = ctx.match[1];
  const w = withdrawals.find(w => w.id === withdrawId);
  if (!w) return await ctx.editMessageText("❌ Request পাওয়া যায়নি।");
  if (w.status !== "pending") return await ctx.editMessageText(`⚠️ ইতিমধ্যে ${w.status}।`);

  w.status = "rejected";
  w.processedAt = new Date().toISOString();
  saveWithdrawals();

  // Refund balance
  const userEarnings = getUserEarnings(w.userId);
  userEarnings.balance = parseFloat((userEarnings.balance + w.amount).toFixed(2));
  saveEarnings();

  await ctx.editMessageText(
    `❌ *Withdraw Rejected & Refunded!*\n\n` +
    `👤 ${w.userName}\n💵 ${w.amount.toFixed(2)} টাকা ফেরত দেওয়া হয়েছে।`,
    { parse_mode: "Markdown" }
  );

  try {
    await ctx.telegram.sendMessage(
      w.userId,
      `❌ *আপনার Withdraw Request বাতিল হয়েছে।*\n\n` +
      `💵 ${w.amount.toFixed(2)} টাকা আপনার balance-এ ফেরত যোগ হয়েছে।`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {}
});

/******************** ADMIN COUNTRY PRICES ********************/
bot.action("admin_country_prices", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  let text = "💰 *Country OTP Prices*\n\n";
  text += `📌 *Default Price:* ${(settings.defaultOtpPrice || 0.25).toFixed(2)} টাকা/OTP\n\n`;
  text += "*প্রতি দেশের মূল্য:*\n";

  for (const cc in countries) {
    const price = countryPrices[cc] !== undefined ? countryPrices[cc] : (settings.defaultOtpPrice || 0.25);
    const custom = countryPrices[cc] !== undefined ? " ✏️" : "";
    text += `${countries[cc].flag} ${countries[cc].name} (+${cc}): *${price.toFixed(2)} TK*${custom}\n`;
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ দেশের Price সেট করুন", callback_data: "admin_set_country_price" }],
        [{ text: "🔄 সব Reset করুন (Default)", callback_data: "admin_reset_prices" }],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

bot.action("admin_set_country_price", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  ctx.session.adminState = "waiting_country_price";

  await ctx.editMessageText(
    "✏️ *Country Price সেট করুন*\n\n" +
    "Format: `[country_code] [price]`\n\n" +
    "*উদাহরণ:*\n" +
    "`880 0.50` → Bangladesh = 0.50 টাকা\n" +
    "`91 0.25` → India = 0.25 টাকা\n" +
    "`1 0.75` → USA = 0.75 টাকা\n\n" +
    "এক message-এ একাধিক দেশ দিতে পারবেন (প্রতি line-এ একটি):",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]]
      }
    }
  );
});

bot.action("admin_reset_prices", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  countryPrices = {};
  saveCountryPrices();
  await ctx.answerCbQuery("✅ সব price reset হয়েছে!");
  await ctx.editMessageText(
    `✅ *সব Country Prices Reset হয়েছে।*\n\nএখন সব দেশে default price (${(settings.defaultOtpPrice || 0.25).toFixed(2)} টাকা) প্রযোজ্য হবে।`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_country_prices" }]] } }
  );
});

/******************** ADMIN BALANCE MANAGEMENT ********************/
bot.action("admin_balance_manage", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  // Top earners
  const topUsers = Object.entries(earnings)
    .sort(([,a],[,b]) => b.totalEarned - a.totalEarned)
    .slice(0, 10);

  let text = "💰 *User Balance Management*\n\n";
  text += `👥 *Total Users with earnings:* ${Object.keys(earnings).length}\n`;
  const totalBalance = Object.values(earnings).reduce((s, e) => s + e.balance, 0);
  const totalEarned = Object.values(earnings).reduce((s, e) => s + e.totalEarned, 0);
  text += `💵 *Total Pending Balance:* ${totalBalance.toFixed(2)} টাকা\n`;
  text += `📈 *Total Ever Earned:* ${totalEarned.toFixed(2)} টাকা\n\n`;

  if (topUsers.length > 0) {
    text += "*🏆 Top Earners:*\n";
    topUsers.forEach(([uid, e], i) => {
      const user = users[uid];
      const name = user ? user.first_name : uid;
      text += `${i+1}. ${name} — ${e.totalEarned.toFixed(2)}TK (Balance: ${e.balance.toFixed(2)}TK)\n`;
    });
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ User Balance যোগ করুন", callback_data: "admin_add_balance" }],
        [{ text: "➖ User Balance কাটুন", callback_data: "admin_deduct_balance" }],
        [{ text: "🔄 User Balance Reset করুন", callback_data: "admin_reset_balance" }],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

bot.action("admin_add_balance", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  ctx.session.adminState = "waiting_add_balance";
  await ctx.editMessageText(
    "➕ *User Balance যোগ করুন*\n\n" +
    "Format: `[user_id] [amount]`\n\n" +
    "উদাহরণ: `123456789 50`\n\n" +
    "User ID পেতে /admin → User Stats দেখুন:",
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] } }
  );
});

bot.action("admin_deduct_balance", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  ctx.session.adminState = "waiting_deduct_balance";
  await ctx.editMessageText(
    "➖ *User Balance কাটুন*\n\n" +
    "Format: `[user_id] [amount]`\n\n" +
    "উদাহরণ: `123456789 25`",
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] } }
  );
});

bot.action("admin_reset_balance", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  ctx.session.adminState = "waiting_reset_balance";
  await ctx.editMessageText(
    "🔄 *User Balance Reset করুন*\n\n" +
    "User ID পাঠান (balance 0 হয়ে যাবে):\n\n" +
    "উদাহরণ: `123456789`",
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] } }
  );
});
bot.action("admin_withdrawals", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const pending = withdrawals.filter(w => w.status === "pending");
  const approved = withdrawals.filter(w => w.status === "approved");
  const rejected = withdrawals.filter(w => w.status === "rejected");
  const totalApproved = approved.reduce((s, w) => s + w.amount, 0);

  let text = `💸 *Withdraw Management*\n\n` +
    `⏳ Pending: *${pending.length}* টি\n` +
    `✅ Approved: *${approved.length}* টি (${totalApproved.toFixed(2)} টাকা)\n` +
    `❌ Rejected: *${rejected.length}* টি\n\n`;

  const buttons = [[{ text: "⏳ Pending Requests", callback_data: "admin_pending_withdrawals" }]];

  if (pending.length > 0) {
    text += `⚠️ *${pending.length}টি pending request আছে!*`;
  }

  buttons.push([
    { text: "📋 সব History", callback_data: "admin_all_withdrawals" },
    { text: "🔙 Back", callback_data: "admin_back" }
  ]);

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action("admin_pending_withdrawals", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const pending = withdrawals.filter(w => w.status === "pending").slice(-10);

  if (pending.length === 0) {
    return await ctx.editMessageText("✅ *কোনো pending request নেই।*", {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_withdrawals" }]] }
    });
  }

  let text = `⏳ *Pending Withdraw Requests (${pending.length}টি):*\n\n`;

  const buttons = [];
  pending.forEach((w, i) => {
    text += `${i + 1}. 👤 ${w.userName} | 💵 ${w.amount.toFixed(2)}TK | ${w.method} | ${w.account}\n`;
    buttons.push([
      { text: `✅ ${w.amount.toFixed(2)}TK-${w.method}`, callback_data: `wadmin_approve:${w.id}` },
      { text: `❌ Reject`, callback_data: `wadmin_reject:${w.id}` }
    ]);
  });

  buttons.push([{ text: "🔙 Back", callback_data: "admin_withdrawals" }]);

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action("admin_all_withdrawals", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const recent = withdrawals.slice(-15).reverse();
  let text = "📋 *Recent Withdrawals (last 15):*\n\n";

  if (recent.length === 0) {
    text += "কোনো request নেই।";
  } else {
    recent.forEach(w => {
      const icon = w.status === "approved" ? "✅" : w.status === "rejected" ? "❌" : "⏳";
      text += `${icon} ${w.userName} | ${w.amount.toFixed(2)}TK | ${w.method}\n`;
    });
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_withdrawals" }]] }
  });
});

/******************** ADMIN SETTINGS - PRICE/WITHDRAW ********************/
bot.action("admin_set_default_price", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  ctx.session.adminState = "waiting_default_price";
  await ctx.editMessageText(
    `💵 *Default OTP Price সেট করুন*\n\nবর্তমান: *${(settings.defaultOtpPrice || 0.25).toFixed(2)} টাকা*\n\nনতুন amount পাঠান (টাকায়, উদা: \`0.50\`):`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] } }
  );
});

bot.action("admin_set_min_withdraw", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  ctx.session.adminState = "waiting_min_withdraw";
  await ctx.editMessageText(
    `💸 *Min Withdraw সেট করুন*\n\nবর্তমান: *${settings.minWithdraw} টাকা*\n\nনতুন amount পাঠান (উদা: \`50\`):`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] } }
  );
});

bot.action("admin_toggle_withdraw", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  settings.withdrawEnabled = !settings.withdrawEnabled;
  saveSettings();
  await ctx.answerCbQuery(`${settings.withdrawEnabled ? "✅ Withdraw চালু" : "❌ Withdraw বন্ধ"} করা হয়েছে`);
  await ctx.editMessageText(
    "⚙️ *Bot Settings*\n\n" +
    `📞 Number Count: *${settings.defaultNumberCount}*\n` +
    `⏱ Cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `🔐 Verification: *${settings.requireVerification ? "চালু ✅" : "বন্ধ ❌"}*\n` +
    `💵 OTP Price (default): *${(settings.defaultOtpPrice || 0.25).toFixed(2)} টাকা*\n` +
    `💸 Min Withdraw: *${settings.minWithdraw} টাকা*\n` +
    `🏧 Withdraw: *${settings.withdrawEnabled ? "চালু ✅" : "বন্ধ ❌"}*\n\n` +
    "পরিবর্তন করতে বাটন চাপুন:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📞 Number Count", callback_data: "admin_set_count" },
            { text: "⏱ Cooldown", callback_data: "admin_set_cooldown" }
          ],
          [
            { text: `🔐 Verification ${settings.requireVerification ? "বন্ধ করুন" : "চালু করুন"}`, callback_data: "admin_toggle_verification" }
          ],
          [
            { text: "💵 OTP Price সেট করুন", callback_data: "admin_set_default_price" },
            { text: "💸 Min Withdraw সেট করুন", callback_data: "admin_set_min_withdraw" }
          ],
          [
            { text: `🏧 Withdraw ${settings.withdrawEnabled ? "🔴 বন্ধ করুন" : "🟢 চালু করুন"}`, callback_data: "admin_toggle_withdraw" }
          ],
          [
            { text: "🔙 Back", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

/******************** ERROR HANDLER ********************/
bot.catch((err, ctx) => {
  console.error(`❌ Bot error for ${ctx.updateType}:`, err);
});

/******************** START BOT ********************/
async function startBot() {
  try {
    console.log("=====================================");
    console.log("🚀 Starting Number Bot...");
    console.log("🤖 Bot Token: [HIDDEN]");
    console.log("🔑 Admin Password: [HIDDEN]");
    console.log("📢 Main Channel ID: " + MAIN_CHANNEL_ID);
    console.log("💬 Chat Group ID: " + CHAT_GROUP_ID);
    console.log("📨 OTP Group ID: " + OTP_GROUP_ID);
    console.log("⚙️ Default Number Count: " + settings.defaultNumberCount);
    console.log("=====================================");

    await bot.launch();

    console.log("✅ Bot started successfully!");
    console.log("📝 User Command: /start");
    console.log("🛠 Admin Login: /adminlogin [PASSWORD]");
    console.log("=====================================");

  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    console.log("🔄 Restarting in 10 seconds...");
    setTimeout(startBot, 10000);
  }
}

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));