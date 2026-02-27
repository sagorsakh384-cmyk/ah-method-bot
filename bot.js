/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAFYIja3-uFmDblVY74_jR9tn6jQhvSBqMk";
const ADMIN_PASSWORD = "sadhin8miya6145";

// ⚠️ IMPORTANT: নিচের ID গুলো আপনার আসল ID দিয়ে পরিবর্তন করুন ⚠️
const MAIN_CHANNEL = "@blackotpnum";
const MAIN_CHANNEL_ID = "-1003306722311";

const CHAT_GROUP = "https://t.me/EarningHub6112";
const CHAT_GROUP_ID = -1003247504066;

const OTP_GROUP = "https://t.me/Spideyhuntotp";
const OTP_GROUP_ID = -1003007557624;

/******************** FILES ********************/
const NUMBERS_FILE = path.join(__dirname, "numbers.txt");
const COUNTRIES_FILE = path.join(__dirname, "countries.json");
const USERS_FILE = path.join(__dirname, "users.json");
const SERVICES_FILE = path.join(__dirname, "services.json");
const ACTIVE_NUMBERS_FILE = path.join(__dirname, "active_numbers.json");
const OTP_LOG_FILE = path.join(__dirname, "otp_log.json");
const ADMINS_FILE = path.join(__dirname, "admins.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");

/******************** DEFAULT SETTINGS ********************/
let settings = {
  defaultNumberCount: 10,
  cooldownSeconds: 5,
  requireVerification: true,
  otpSettings: {
    enabled: true,                    // OTP সিস্টেম অন/অফ
    autoForward: true,                 // অটো ফরওয়ার্ড অন/অফ
    notifyUser: true,                  // ইউজারকে নোটিফিকেশন দিবে কিনা
    logOTP: true,                      // OTP লগ রাখবে কিনা
    deleteAfterForward: false,          // ফরওয়ার্ডের পর ডিলিট করবে কিনা
    requireNumberMatch: true,           // নাম্বার ম্যাচিং প্রয়োজন কিনা
    checkLastDigits: true,              // শেষ ডিজিট চেক করবে কিনা
    maxOTPPerNumber: 10,                // প্রতি নাম্বারে সর্বোচ্চ OTP
    otpExpiryMinutes: 30                 // OTP এক্সপায়ারি টাইম (মিনিট)
  }
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
      otpCount: 0,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 মিনিট এক্সপায়ারি
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

  const showStart = Math.min(7, total - 4);
  const startPart = digitsOnly.slice(0, showStart);
  const endPart = digitsOnly.slice(-4);
  const masked = 'ⓎⓄⓊ';
  
  return `${startPart}${masked}${endPart}`;
}

/******************** ENHANCED: Extract Phone Number From Message ********************/
function extractPhoneNumberFromMessage(text) {
  if (!text) return null;

  console.log("🔍 Extracting number from:", text.substring(0, 100));

  // প্যাটার্ন 1: "Number: 2250779ⓎⓄⓊ575" বা "📞 Number: 2250779ⓎⓄⓊ575"
  const pattern1 = /(?:Number|📞|☎️)[^\d]*[\:\»]?\s*(\d{4,7}[ⓎⓄⓊ★\*\-]{3,}\d{3,5})/i;
  let match = text.match(pattern1);
  if (match) {
    let number = match[1].replace(/[ⓎⓄⓊ★\*\s\-]/g, '');
    console.log("✅ Pattern 1 matched:", number);
    if (/^\d{10,15}$/.test(number)) return number;
  }

  // প্যাটার্ন 2: স্পেশাল ক্যারেক্টার সহ নাম্বার (2250779ⓎⓄⓊ575)
  const pattern2 = /(\d{4,7}[ⓎⓄⓊ★\*]{3,}\d{3,5})/;
  match = text.match(pattern2);
  if (match) {
    let number = match[1].replace(/[ⓎⓄⓊ★\*\s\-]/g, '');
    console.log("✅ Pattern 2 matched:", number);
    if (/^\d{10,15}$/.test(number)) return number;
  }

  // প্যাটার্ন 3: সাধারণ ফোন নাম্বার
  const pattern3 = /(\d{10,15})/;
  match = text.match(pattern3);
  if (match) {
    console.log("✅ Pattern 3 matched:", match[1]);
    return match[1];
  }

  return null;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second']
  ];

  for (const [secondsIn, unit] of intervals) {
    const interval = Math.floor(seconds / secondsIn);
    if (interval >= 1) {
      return interval + ' ' + unit + (interval > 1 ? 's' : '') + ' ago';
    }
  }
  return 'just now';
}

/******************** VERIFICATION FUNCTION ********************/
async function checkUserMembership(ctx) {
  try {
    const userId = ctx.from.id;
    
    let isMainChannelMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(MAIN_CHANNEL_ID, userId);
      isMainChannelMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
      console.log("Error checking main channel:", error.message);
    }

    let isChatGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(CHAT_GROUP_ID, userId);
      isChatGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
      console.log("Error checking chat group:", error.message);
    }

    let isOTPGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(OTP_GROUP_ID, userId);
      isOTPGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
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
    return { mainChannel: false, chatGroup: false, otpGroup: false, allJoined: false };
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
    lastVerificationCheck: 0
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
        verified: ctx.session?.verified || false,
        totalOTPs: 0,
        totalNumbers: 0
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

/******************** VERIFICATION MIDDLEWARE ********************/
bot.use(async (ctx, next) => {
  if (ctx.session?.isAdmin) return next();
  if (ctx.message?.text?.startsWith('/start') || ctx.message?.text?.startsWith('/adminlogin')) return next();
  if (ctx.callbackQuery?.data === 'verify_user') return next();
  if (!ctx.from) return next();
  if (!settings.requireVerification) return next();
  if (ctx.session?.verified) return next();

  const now = Date.now();
  if (ctx.session?.lastVerificationCheck && (now - ctx.session.lastVerificationCheck) < 24 * 60 * 60 * 1000) {
    return next();
  }

  const membership = await checkUserMembership(ctx);
  
  if (membership.allJoined) {
    ctx.session.verified = true;
    ctx.session.lastVerificationCheck = now;
    return next();
  }

  try {
    await ctx.reply(
      "⛔ *Verification Required*\n\n" +
      "You must join ALL 3 required groups to use this bot:\n\n" +
      "1️⃣ 📢 *Main Channel:* @blackotpnum\n" +
      "2️⃣ 💬 *Chat Group:* Smart Earning Hub\n" +
      "3️⃣ 📨 *OTP Group:* @Spideyhuntotp\n\n" +
      "👉 Click /start to join and verify.",
      { parse_mode: "Markdown" }
    );
  } catch (error) {}

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
            ["📞 Get Numbers", "🔄 Change Numbers"],
            ["ℹ️ Help", "🏠 Main Menu"]
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

      if (users[ctx.from.id]) {
        users[ctx.from.id].verified = true;
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
bot.hears("📞 Get Numbers", async (ctx) => {
  const serviceButtons = [];
  for (const serviceId in services) {
    const service = services[serviceId];
    const availableCountries = getAvailableCountriesForService(serviceId);

    if (availableCountries.length > 0) {
      serviceButtons.push([
        { 
          text: `${service.icon} ${service.name}`, 
          callback_data: `select_service:${serviceId}` 
        }
      ]);
    }
  }

  if (serviceButtons.length === 0) {
    return await ctx.reply(
      "📭 *No Numbers Available*\n\n" +
      "Sorry, all numbers are currently in use.\n" +
      "Please try again later or contact admin.",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply(
    "🎯 *Select Service*\n\n" +
    "Choose the service you need numbers for:",
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
      return await ctx.answerCbQuery("❌ No numbers for this service", { show_alert: true });
    }

    const countryButtons = availableCountries.map(countryCode => {
      const country = countries[countryCode];
      const count = numbersByCountryService[countryCode][serviceId].length;

      return [
        { 
          text: `${country.flag} ${country.name} (${count})`, 
          callback_data: `select_country:${serviceId}:${countryCode}` 
        }
      ];
    });

    countryButtons.push([
      { text: "🔙 Back to Services", callback_data: "back_to_services" }
    ]);

    await ctx.editMessageText(
      `🌍 *Select Country*\n\nChoose a country:`,
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

    if (users[userId]) {
      users[userId].totalNumbers = (users[userId].totalNumbers || 0) + numbers.length;
      saveUsers();
    }

    const country = countries[countryCode];
    const service = services[serviceId];

    let numbersText = "";
    numbers.forEach((num, index) => {
      const maskedNum = maskPhoneNumber(num);
      numbersText += `${index + 1}. \`+${maskedNum}\`\n`;
    });

    const message = 
      `✅ *${numbers.length} Numbers Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n\n` +
      `📞 *Numbers:*\n${numbersText}\n\n` +
      `⏳ *OTP will be forwarded automatically*\n` +
      `📨 *OTP Group:* ${OTP_GROUP}`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📨 OTP Group", url: OTP_GROUP }],
          [{ text: "🔄 Get New Numbers", callback_data: `get_new_numbers:${serviceId}:${countryCode}` }],
          [{ text: "🔙 Back to Services", callback_data: "back_to_services" }]
        ]
      }
    });
  } catch (error) {
    console.error("Country selection error:", error);
    await ctx.answerCbQuery("❌ Error", { show_alert: true });
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

    if (users[userId]) {
      users[userId].totalNumbers = (users[userId].totalNumbers || 0) + numbers.length;
      saveUsers();
    }

    const country = countries[countryCode];
    const service = services[serviceId];

    let numbersText = "";
    numbers.forEach((num, index) => {
      const maskedNum = maskPhoneNumber(num);
      numbersText += `${index + 1}. \`+${maskedNum}\`\n`;
    });

    const message = 
      `✅ *${numbers.length} New Numbers Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n\n` +
      `📞 *Numbers:*\n${numbersText}\n\n` +
      `⏳ *OTP will be forwarded automatically*`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📨 OTP Group", url: OTP_GROUP }],
          [{ text: "🔄 Get New Numbers", callback_data: `get_new_numbers:${serviceId}:${countryCode}` }],
          [{ text: "🔙 Back to Services", callback_data: "back_to_services" }]
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

  if (users[userId]) {
    users[userId].totalNumbers = (users[userId].totalNumbers || 0) + numbers.length;
    saveUsers();
  }

  const country = countries[countryCode];
  const service = services[serviceId];

  let numbersText = "";
  numbers.forEach((num, index) => {
    const maskedNum = maskPhoneNumber(num);
    numbersText += `${index + 1}. \`+${maskedNum}\`\n`;
  });

  const message = 
    `✅ *${numbers.length} New Numbers Received!*\n\n` +
    `📱 *Service:* ${service.name}\n` +
    `${country.flag} *Country:* ${country.name}\n\n` +
    `📞 *Numbers:*\n${numbersText}\n\n` +
    `⏳ *OTP will be forwarded automatically*`;

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📨 OTP Group", url: OTP_GROUP }],
        [{ text: "🔄 Get New Numbers", callback_data: `get_new_numbers:${serviceId}:${countryCode}` }],
        [{ text: "🔙 Back to Services", callback_data: "back_to_services" }]
      ]
    }
  });
});

/******************** BACK TO SERVICES ********************/
bot.action("back_to_services", async (ctx) => {
  try {
    const serviceButtons = [];
    for (const serviceId in services) {
      const service = services[serviceId];
      const availableCountries = getAvailableCountriesForService(serviceId);

      if (availableCountries.length > 0) {
        serviceButtons.push([
          { 
            text: `${service.icon} ${service.name}`, 
            callback_data: `select_service:${serviceId}` 
          }
        ]);
      }
    }

    await ctx.editMessageText(
      "🎯 *Select Service*\n\nChoose the service you need numbers for:",
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

/******************** HELP ********************/
bot.hears("ℹ️ Help", async (ctx) => {
  await ctx.reply(
    "📖 *Bot Help*\n\n" +
    "• 📞 *Get Numbers* - Get new numbers (count: " + settings.defaultNumberCount + ")\n" +
    "• 🔄 *Change Numbers* - Get new set of numbers\n" +
    "• 🏠 *Main Menu* - Return to main menu\n\n" +
    "🔐 *Verification:* You must join all 3 groups to use this bot.\n\n" +
    "Admin commands: /adminlogin",
    { parse_mode: "Markdown" }
  );
});

/******************** MAIN MENU ********************/
bot.hears("🏠 Main Menu", async (ctx) => {
  await showMainMenu(ctx);
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

/******************** ENHANCED: ADMIN PANEL WITH OTP CONTROL ********************/
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
        { text: "🔍 Debug", callback_data: "admin_debug" }
      ],
      [
        { text: "🤖 OTP Control", callback_data: "admin_otp_control" }
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

/******************** ENHANCED: OTP CONTROL PANEL ********************/
bot.action("admin_otp_control", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  const otp = settings.otpSettings;
  const status = otp.enabled ? "✅ *ENABLED*" : "❌ *DISABLED*";

  const message = 
    "🤖 *OTP System Control*\n\n" +
    `📊 *Current Status:* ${status}\n\n` +
    "⚙️ *Settings:*\n" +
    `• Auto Forward: ${otp.autoForward ? '✅' : '❌'}\n` +
    `• Notify User: ${otp.notifyUser ? '✅' : '❌'}\n` +
    `• Log OTP: ${otp.logOTP ? '✅' : '❌'}\n` +
    `• Number Match Required: ${otp.requireNumberMatch ? '✅' : '❌'}\n` +
    `• Check Last Digits: ${otp.checkLastDigits ? '✅' : '❌'}\n` +
    `• Max OTP per Number: ${otp.maxOTPPerNumber}\n` +
    `• OTP Expiry: ${otp.otpExpiryMinutes} minutes\n\n` +
    "Select an option to configure:";

  const buttons = [
    [
      { text: otp.enabled ? "🔴 Disable OTP" : "🟢 Enable OTP", callback_data: "admin_otp_toggle" }
    ],
    [
      { text: "📨 Auto Forward", callback_data: "admin_otp_auto" },
      { text: "🔔 User Notify", callback_data: "admin_otp_notify" }
    ],
    [
      { text: "📝 OTP Log", callback_data: "admin_otp_log_toggle" },
      { text: "🔢 Number Match", callback_data: "admin_otp_match" }
    ],
    [
      { text: "📱 Last Digits", callback_data: "admin_otp_digits" }
    ],
    [
      { text: "📊 Set Max OTP", callback_data: "admin_otp_set_max" },
      { text: "⏱ Set Expiry", callback_data: "admin_otp_set_expiry" }
    ],
    [
      { text: "📋 View Active", callback_data: "admin_otp_view_active" },
      { text: "🧹 Clear Expired", callback_data: "admin_otp_clear_expired" }
    ],
    [
      { text: "🔙 Back to Admin", callback_data: "admin_back" }
    ]
  ];

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

/******************** OTP CONTROL HANDLERS ********************/
bot.action("admin_otp_toggle", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  settings.otpSettings.enabled = !settings.otpSettings.enabled;
  saveSettings();
  await ctx.answerCbQuery(`✅ OTP ${settings.otpSettings.enabled ? 'Enabled' : 'Disabled'}`);
  ctx.session.adminState = "otp_control";
  await ctx.editMessageText("⚙️ *OTP Settings Updated*\n\nReturning to OTP control...", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_auto", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  settings.otpSettings.autoForward = !settings.otpSettings.autoForward;
  saveSettings();
  await ctx.answerCbQuery(`✅ Auto Forward: ${settings.otpSettings.autoForward ? 'ON' : 'OFF'}`);
  ctx.session.adminState = "otp_control";
  await ctx.editMessageText("⚙️ *Auto Forward Updated*\n\nReturning to OTP control...", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_notify", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  settings.otpSettings.notifyUser = !settings.otpSettings.notifyUser;
  saveSettings();
  await ctx.answerCbQuery(`✅ User Notify: ${settings.otpSettings.notifyUser ? 'ON' : 'OFF'}`);
  ctx.session.adminState = "otp_control";
  await ctx.editMessageText("⚙️ *User Notification Updated*\n\nReturning to OTP control...", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_log_toggle", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  settings.otpSettings.logOTP = !settings.otpSettings.logOTP;
  saveSettings();
  await ctx.answerCbQuery(`✅ OTP Log: ${settings.otpSettings.logOTP ? 'ON' : 'OFF'}`);
  ctx.session.adminState = "otp_control";
  await ctx.editMessageText("⚙️ *OTP Logging Updated*\n\nReturning to OTP control...", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_match", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  settings.otpSettings.requireNumberMatch = !settings.otpSettings.requireNumberMatch;
  saveSettings();
  await ctx.answerCbQuery(`✅ Number Match: ${settings.otpSettings.requireNumberMatch ? 'ON' : 'OFF'}`);
  ctx.session.adminState = "otp_control";
  await ctx.editMessageText("⚙️ *Number Match Updated*\n\nReturning to OTP control...", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_digits", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  settings.otpSettings.checkLastDigits = !settings.otpSettings.checkLastDigits;
  saveSettings();
  await ctx.answerCbQuery(`✅ Last Digits Check: ${settings.otpSettings.checkLastDigits ? 'ON' : 'OFF'}`);
  ctx.session.adminState = "otp_control";
  await ctx.editMessageText("⚙️ *Last Digits Check Updated*\n\nReturning to OTP control...", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_set_max", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_set_max_otp";
  await ctx.editMessageText(
    `📊 *Set Maximum OTP per Number*\n\n` +
    `Current: *${settings.otpSettings.maxOTPPerNumber}*\n\n` +
    `Send the new maximum OTP count (1-100):`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
    }
  );
});

bot.action("admin_otp_set_expiry", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_set_otp_expiry";
  await ctx.editMessageText(
    `⏱ *Set OTP Expiry Time*\n\n` +
    `Current: *${settings.otpSettings.otpExpiryMinutes} minutes*\n\n` +
    `Send the new expiry time in minutes (1-1440):`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
    }
  );
});

bot.action("admin_otp_view_active", async (ctx) => {
  if (!ctx.session.isAdmin) return;

  let message = "📋 *Active Numbers with OTPs*\n\n";
  let active = 0;

  for (const [number, data] of Object.entries(activeNumbers)) {
    const expiresIn = Math.round((new Date(data.expiresAt) - new Date()) / 60000);
    if (expiresIn > 0) {
      message += `📞 \`+${number}\`\n`;
      message += `👤 User: ${data.userId}\n`;
      message += `🔧 Service: ${data.service}\n`;
      message += `📊 OTPs: ${data.otpCount || 0}/${settings.otpSettings.maxOTPPerNumber}\n`;
      message += `⏳ Expires: ${expiresIn} minutes\n\n`;
      active++;
    }
  }

  if (active === 0) {
    message += "No active numbers found.";
  } else {
    message += `📊 *Total Active: ${active}*`;
  }

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔄 Refresh", callback_data: "admin_otp_view_active" }], [{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
  });
});

bot.action("admin_otp_clear_expired", async (ctx) => {
  if (!ctx.session.isAdmin) return;

  let cleared = 0;
  const now = new Date();

  for (const [number, data] of Object.entries(activeNumbers)) {
    if (new Date(data.expiresAt) < now) {
      delete activeNumbers[number];
      cleared++;
    }
  }

  saveActiveNumbers();
  await ctx.answerCbQuery(`✅ Cleared ${cleared} expired numbers`);
  
  await ctx.editMessageText(
    `🧹 *Expired Numbers Cleared*\n\n` +
    `Removed: *${cleared}* expired numbers`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_otp_control" }]] }
    }
  );
});

/******************** ENHANCED: OTP GROUP MONITORING WITH FULL CONTROL ********************/
bot.on("message", async (ctx) => {
  try {
    // শুধু OTP গ্রুপের মেসেজ প্রসেস করি
    if (ctx.chat.id !== OTP_GROUP_ID) return;

    // OTP সিস্টেম বন্ধ থাকলে কিছু করবো না
    if (!settings.otpSettings.enabled) {
      console.log("⚠️ OTP System is disabled");
      return;
    }

    const messageText = ctx.message.text || ctx.message.caption || '';
    const messageId = ctx.message.message_id;

    if (!messageText) return;

    console.log("\n📨 ===== NEW OTP MESSAGE =====");
    console.log(`Message ID: ${messageId}`);
    console.log(`Message: ${messageText.substring(0, 200)}`);

    // অটো ফরওয়ার্ড বন্ধ থাকলে শুধু লগ করি
    if (!settings.otpSettings.autoForward) {
      console.log("⚠️ Auto Forward is disabled");
      
      if (settings.otpSettings.logOTP) {
        otpLog.push({
          type: 'MANUAL',
          message: messageText.substring(0, 200),
          timestamp: new Date().toISOString(),
          messageId: messageId
        });
        saveOTPLog();
      }
      return;
    }

    // প্রথমে মেসেজ থেকে নাম্বার বের করি
    let extractedNumber = null;
    
    if (settings.otpSettings.requireNumberMatch) {
      extractedNumber = extractPhoneNumberFromMessage(messageText);
      console.log(`📞 Extracted number: ${extractedNumber || 'None'}`);
    }

    // যদি নাম্বার না পাওয়া যায় এবং লাস্ট ডিজিট চেক অন থাকে, তাহলে অ্যাক্টিভ নাম্বারগুলোর সাথে মিলিয়ে দেখি
    if (!extractedNumber && settings.otpSettings.checkLastDigits) {
      console.log("🔍 Checking last digits of active numbers...");
      
      const now = new Date();
      for (const [activeNumber, data] of Object.entries(activeNumbers)) {
        // এক্সপায়ার চেক
        if (new Date(data.expiresAt) < now) {
          console.log(`⏳ Number ${activeNumber} expired, removing...`);
          delete activeNumbers[activeNumber];
          continue;
        }

        // ওটিপি কাউন্ট চেক
        if (data.otpCount >= settings.otpSettings.maxOTPPerNumber) {
          console.log(`⚠️ Number ${activeNumber} reached max OTP limit`);
          continue;
        }

        const last4 = activeNumber.slice(-4);
        const last5 = activeNumber.slice(-5);
        const last6 = activeNumber.slice(-6);
        
        if (messageText.includes(last6) || messageText.includes(last5) || messageText.includes(last4)) {
          console.log(`✅ Match found! Active number: ${activeNumber}`);
          extractedNumber = activeNumber;
          break;
        }
      }
    }

    if (!extractedNumber) {
      console.log("❌ No phone number found in message");
      return;
    }

    // চেক করি এই নাম্বারটি কোন ইউজারের কাছে আছে কিনা
    if (!activeNumbers[extractedNumber]) {
      console.log(`❌ No active user for number: ${extractedNumber}`);
      return;
    }

    const userData = activeNumbers[extractedNumber];
    const userId = userData.userId;
    
    // ওটিপি কাউন্ট আপডেট
    userData.otpCount = (userData.otpCount || 0) + 1;
    userData.lastOTP = new Date().toISOString();
    
    console.log(`👤 User ID: ${userId}`);
    console.log(`📱 Service: ${userData.service}`);
    console.log(`📊 OTP Count: ${userData.otpCount}/${settings.otpSettings.maxOTPPerNumber}`);

    // ইউজারের কাছে মেসেজ ফরওয়ার্ড করি
    try {
      const result = await ctx.telegram.forwardMessage(userId, OTP_GROUP_ID, messageId);
      
      if (result) {
        console.log(`✅ OTP forwarded successfully to user ${userId}`);
        
        // ইউজারের ওটিপি কাউন্ট আপডেট
        if (users[userId]) {
          users[userId].totalOTPs = (users[userId].totalOTPs || 0) + 1;
          saveUsers();
        }
        
        // OTP লগ
        if (settings.otpSettings.logOTP) {
          otpLog.push({
            phoneNumber: extractedNumber,
            userId: userId,
            service: userData.service,
            messageId: messageId,
            delivered: true,
            timestamp: new Date().toISOString(),
            otpCount: userData.otpCount,
            messagePreview: messageText.substring(0, 100)
          });
          saveOTPLog();
        }
        
        // ইউজারকে নোটিফিকেশন (যদি অন থাকে)
        if (settings.otpSettings.notifyUser) {
          try {
            await ctx.telegram.sendMessage(userId, 
              "🔔 *New OTP Received!*\n\n" +
              `📞 Number: \`+${maskPhoneNumber(extractedNumber)}\`\n` +
              `🔧 Service: ${services[userData.service]?.name || userData.service}\n` +
              `📊 Total OTPs: ${userData.otpCount}`,
              { parse_mode: "Markdown" }
            );
          } catch (notifyError) {
            console.log("Could not send notification to user:", notifyError.message);
          }
        }
        
        // সর্বোচ্চ ওটিপি লিমিট চেক
        if (userData.otpCount >= settings.otpSettings.maxOTPPerNumber) {
          try {
            await ctx.telegram.sendMessage(userId,
              "⚠️ *Maximum OTP Limit Reached*\n\n" +
              `This number has received ${settings.otpSettings.maxOTPPerNumber} OTPs.\n` +
              `Please get a new number using "🔄 Change Numbers".`,
              { parse_mode: "Markdown" }
            );
          } catch (notifyError) {}
        }
        
      } else {
        console.log(`❌ Failed to forward OTP to user ${userId}`);
      }
    } catch (forwardError) {
      console.error(`❌ Error forwarding to user ${userId}:`, forwardError.message);
      
      // ইউজার বট ব্লক করে থাকলে অ্যাক্টিভ নাম্বার থেকে রিমুভ করি
      if (forwardError.code === 403) {
        console.log(`🚫 User ${userId} blocked the bot. Removing active number.`);
        delete activeNumbers[extractedNumber];
        saveActiveNumbers();
      }
    }

    // অ্যাক্টিভ নাম্বার সেভ
    saveActiveNumbers();

  } catch (error) {
    console.error("❌ OTP monitoring error:", error);
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

  const now = new Date();
  let activeValid = 0;
  for (const [num, data] of Object.entries(activeNumbers)) {
    if (new Date(data.expiresAt) > now) activeValid++;
  }

  report += `\n📈 *Grand Total:* ${totalNumbers} numbers\n`;
  report += `👥 *Active Users:* ${activeValid}\n`;
  report += `📨 *OTPs Forwarded:* ${otpLog.length}\n`;
  report += `🤖 *OTP System:* ${settings.otpSettings.enabled ? '✅ ON' : '❌ OFF'}`;

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

/******************** ADMIN USER STATS ********************/
bot.action("admin_users", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");

  try {
    let message = "👥 *User Statistics*\n\n";

    const totalUsers = Object.keys(users).length;
    const activeUsers = Object.keys(activeNumbers).length;
    const totalOTPs = otpLog.length;

    message += `📊 *Statistics:*\n`;
    message += `• Total Users: ${totalUsers}\n`;
    message += `• Active Users: ${activeUsers}\n`;
    message += `• Total OTPs: ${totalOTPs}\n\n`;

    if (totalUsers > 0) {
      message += `📋 *Top Users (by OTPs):*\n`;

      const sortedUsers = Object.values(users)
        .sort((a, b) => (b.totalOTPs || 0) - (a.totalOTPs || 0))
        .slice(0, 5);

      for (const user of sortedUsers) {
        message += `\n👤 *${user.first_name}* (${user.totalOTPs || 0} OTPs)\n`;
        message += `🆔 ID: ${user.id}\n`;
      }
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
    await ctx.answerCbQuery("❌ Error");
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
      message += `📞 ${log.phoneNumber || 'Unknown'} → 👤 ${log.userId || 'N/A'}\n`;
      message += `🕐 ${timeAgo}\n`;
      if (log.otpCount) message += `📊 Count: ${log.otpCount}\n`;
      message += `\n`;
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

/******************** ADMIN DEBUG ********************/
bot.action("admin_debug", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("❌ Admin only");
  
  try {
    const now = new Date();
    let activeValid = 0;
    for (const [num, data] of Object.entries(activeNumbers)) {
      if (new Date(data.expiresAt) > now) activeValid++;
    }

    const message = `
🔍 *Debug Information*

📊 *Active Numbers:* ${Object.keys(activeNumbers).length} (Valid: ${activeValid})
👥 *Total Users:* ${Object.keys(users).length}
📝 *OTP Logs:* ${otpLog.length}

🤖 *OTP Settings:*
• Enabled: ${settings.otpSettings.enabled ? '✅' : '❌'}
• Auto Forward: ${settings.otpSettings.autoForward ? '✅' : '❌'}
• Notify User: ${settings.otpSettings.notifyUser ? '✅' : '❌'}
• Log OTP: ${settings.otpSettings.logOTP ? '✅' : '❌'}
• Max OTP/Number: ${settings.otpSettings.maxOTPPerNumber}
• Expiry: ${settings.otpSettings.otpExpiryMinutes}m

⚙️ *Settings:*
• Number Count: ${settings.defaultNumberCount}
• Cooldown: ${settings.cooldownSeconds}s
• Verification: ${settings.requireVerification ? '✅' : '❌'}
`;
    
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Refresh", callback_data: "admin_debug" }],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    });
    
  } catch (error) {
    console.error("Debug error:", error);
    await ctx.answerCbQuery("❌ Error");
  }
});

/******************** TEXT HANDLER FOR ADMIN ********************/
bot.on("text", async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text || !ctx.session.isAdmin || !ctx.session.adminState) return;

    const adminState = ctx.session.adminState;
    const text = ctx.message.text;

    if (adminState === "waiting_set_max_otp") {
      const count = parseInt(text);
      if (isNaN(count) || count < 1 || count > 100) {
        return await ctx.reply("❌ Please send a valid number between 1 and 100.");
      }

      settings.otpSettings.maxOTPPerNumber = count;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(`✅ Max OTP per number set to *${count}*!`, { parse_mode: "Markdown" });

    } else if (adminState === "waiting_set_otp_expiry") {
      const minutes = parseInt(text);
      if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
        return await ctx.reply("❌ Please send a valid number between 1 and 1440.");
      }

      settings.otpSettings.otpExpiryMinutes = minutes;
      
      // এক্সপায়ারি টাইম আপডেট
      for (const [number, data] of Object.entries(activeNumbers)) {
        data.expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      }
      saveActiveNumbers();
      saveSettings();
      
      ctx.session.adminState = null;
      await ctx.reply(`✅ OTP expiry set to *${minutes} minutes*!`, { parse_mode: "Markdown" });

    } else if (adminState === "waiting_set_count") {
      const count = parseInt(text);
      if (isNaN(count) || count < 1 || count > 100) {
        return await ctx.reply("❌ Please send a valid number between 1 and 100.");
      }
      settings.defaultNumberCount = count;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(`✅ Number count set to *${count}*!`, { parse_mode: "Markdown" });

    } else if (adminState === "waiting_set_cooldown") {
      const seconds = parseInt(text);
      if (isNaN(seconds) || seconds < 1 || seconds > 3600) {
        return await ctx.reply("❌ Please send a valid number between 1 and 3600.");
      }
      settings.cooldownSeconds = seconds;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(`✅ Cooldown set to *${seconds} seconds*!`, { parse_mode: "Markdown" });

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
        `📢 *Broadcast Complete!*\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}`,
        { parse_mode: "Markdown" }
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
      await ctx.reply(`✅ *Numbers Added!*\n\n✅ Added: ${added}\n❌ Failed: ${failed}`, { parse_mode: "Markdown" });

    } else if (adminState === "waiting_add_country") {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 3) {
        const countryCode = parts[0];
        const countryName = parts.slice(1, -1).join(" ");
        const flag = parts[parts.length - 1];

        countries[countryCode] = { name: countryName, flag: flag };
        saveCountries();
        ctx.session.adminState = null;
        await ctx.reply(`✅ *Country Added!*\n\n📌 +${countryCode} ${countryName} ${flag}`, { parse_mode: "Markdown" });
      } else {
        await ctx.reply("❌ Invalid format. Use: `[code] [name] [flag]`", { parse_mode: "Markdown" });
      }

    } else if (adminState === "waiting_add_service") {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 3) {
        const serviceId = parts[0].toLowerCase();
        const serviceName = parts.slice(1, -1).join(" ");
        const icon = parts[parts.length - 1];

        services[serviceId] = { name: serviceName, icon: icon };
        saveServices();
        ctx.session.adminState = null;
        await ctx.reply(`✅ *Service Added!*\n\n${icon} ${serviceName} (ID: \`${serviceId}\`)`, { parse_mode: "Markdown" });
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
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
        }).on('error', reject);
      });

      const serviceId = ctx.session.adminData?.serviceId;
      if (!serviceId) {
        await ctx.reply("❌ Service not selected.");
        return;
      }

      const lines = fileContent.split(/\r?\n/);
      let added = 0, skipped = 0, invalid = 0;

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

        if (!/^\d{10,15}$/.test(number)) { invalid++; continue; }
        if (!countryCode) { invalid++; continue; }

        if (!countries[countryCode]) {
          countries[countryCode] = { name: `Country ${countryCode}`, flag: "🏳️" };
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
        `📊 Results:\n✅ Added: ${added}\n↪️ Duplicate: ${skipped}\n❌ Invalid: ${invalid}`,
        { parse_mode: "Markdown" }
      );

    } catch (error) {
      console.error("File processing error:", error);
      await ctx.reply("❌ Error processing file.");
    }

  } catch (error) {
    console.error("File upload error:", error);
    await ctx.reply("❌ Error uploading file.");
  }
});

/******************** ADMIN BACK ********************/
bot.action("admin_back", async (ctx) => {
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
      { text: "🔍 Debug", callback_data: "admin_debug" }
    ],
    [
      { text: "🤖 OTP Control", callback_data: "admin_otp_control" }
    ]
  ];

  buttons.push([
    { text: "🚪 Logout", callback_data: "admin_logout" }
  ]);

  await ctx.editMessageText(
    "🛠 *Admin Dashboard*\n\nSelect an option:",
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
  await ctx.editMessageText("❌ *Action Cancelled*", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🛠 Back to Admin", callback_data: "admin_back" }]] }
  });
});

/******************** ADMIN LOGOUT ********************/
bot.action("admin_logout", async (ctx) => {
  ctx.session.isAdmin = false;
  ctx.session.adminState = null;
  ctx.session.adminData = null;
  await ctx.editMessageText("🚪 *Admin Logged Out*", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back to Main", callback_data: "back_to_services" }]] }
  });
});

/******************** ADMIN DELETE NUMBERS ********************/
bot.action("admin_delete", async (ctx) => {
  if (!ctx.session.isAdmin) return;

  let report = "❌ *Delete Numbers*\n\nSelect numbers to delete:\n\n";
  const buttons = [];

  for (const countryCode in numbersByCountryService) {
    const country = countries[countryCode];
    const countryName = country ? `${country.flag} ${country.name}` : countryCode;

    for (const serviceId in numbersByCountryService[countryCode]) {
      const service = services[serviceId];
      const count = numbersByCountryService[countryCode][serviceId].length;
      if (count > 0) {
        buttons.push([
          { text: `🗑️ ${countryName} - ${service?.icon} ${service?.name} (${count})`, 
            callback_data: `admin_delete_confirm:${countryCode}:${serviceId}` }
        ]);
      }
    }
  }

  buttons.push([{ text: "❌ Cancel", callback_data: "admin_cancel" }]);
  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_delete_confirm:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];
  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;

  await ctx.editMessageText(
    `⚠️ *Confirm Deletion*\n\nDelete ${count} numbers?\nCountry: ${countryCode}\nService: ${services[serviceId]?.name || serviceId}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Yes", callback_data: `admin_delete_execute:${countryCode}:${serviceId}` },
           { text: "❌ No", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

bot.action(/^admin_delete_execute:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];
  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;

  delete numbersByCountryService[countryCode][serviceId];
  if (Object.keys(numbersByCountryService[countryCode]).length === 0) {
    delete numbersByCountryService[countryCode];
  }

  saveNumbers();
  await ctx.editMessageText(`✅ *Deleted ${count} numbers*`, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_back" }]] }
  });
});

/******************** ADMIN SETTINGS ********************/
bot.action("admin_settings", async (ctx) => {
  if (!ctx.session.isAdmin) return;

  await ctx.editMessageText(
    "⚙️ *Bot Settings*\n\n" +
    `• Number Count: *${settings.defaultNumberCount}*\n` +
    `• Cooldown: *${settings.cooldownSeconds}s*\n` +
    `• Verification: *${settings.requireVerification ? "Yes" : "No"}*\n\n` +
    "Select what to change:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📞 Number Count", callback_data: "admin_set_count" },
           { text: "⏱ Cooldown", callback_data: "admin_set_cooldown" }],
          [{ text: "🔓 Toggle Verification", callback_data: "admin_toggle_verification" }],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

bot.action("admin_set_count", async (ctx) => {
  ctx.session.adminState = "waiting_set_count";
  await ctx.editMessageText(`Send new number count (1-100):`, {
    reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
  });
});

bot.action("admin_set_cooldown", async (ctx) => {
  ctx.session.adminState = "waiting_set_cooldown";
  await ctx.editMessageText(`Send new cooldown in seconds (1-3600):`, {
    reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
  });
});

bot.action("admin_toggle_verification", async (ctx) => {
  settings.requireVerification = !settings.requireVerification;
  saveSettings();
  await ctx.answerCbQuery(`✅ Verification ${settings.requireVerification ? "enabled" : "disabled"}`);
  ctx.session.adminState = "admin_settings";
  await ctx.editMessageText("⚙️ *Setting Updated*", {
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_settings" }]] }
  });
});

/******************** ADMIN MANAGE SERVICES ********************/
bot.action("admin_manage_services", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  await ctx.editMessageText(
    "🔧 *Manage Services*",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 List", callback_data: "admin_list_services" },
           { text: "➕ Add", callback_data: "admin_add_service" }],
          [{ text: "🗑️ Delete", callback_data: "admin_delete_service" }],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

bot.action("admin_list_services", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  let report = "📋 *Services*\n\n";
  for (const [id, s] of Object.entries(services)) {
    report += `${s.icon} *${s.name}* (\`${id}\`)\n`;
  }
  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_manage_services" }]] }
  });
});

bot.action("admin_add_service", async (ctx) => {
  ctx.session.adminState = "waiting_add_service";
  await ctx.editMessageText("Send: `[id] [name] [icon]`\nExample: `gmail Gmail 📧`", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
  });
});

bot.action("admin_delete_service", async (ctx) => {
  const buttons = [];
  for (const [id, s] of Object.entries(services)) {
    buttons.push([{ text: `${s.icon} ${s.name}`, callback_data: `admin_delete_service_confirm:${id}` }]);
  }
  buttons.push([{ text: "❌ Cancel", callback_data: "admin_manage_services" }]);
  await ctx.editMessageText("Select service to delete:", {
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_delete_service_confirm:(.+)$/, async (ctx) => {
  const id = ctx.match[1];
  await ctx.editMessageText(`Delete *${services[id]?.name}*?`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Yes", callback_data: `admin_delete_service_execute:${id}` },
         { text: "❌ No", callback_data: "admin_manage_services" }]
      ]
    }
  });
});

bot.action(/^admin_delete_service_execute:(.+)$/, async (ctx) => {
  const id = ctx.match[1];
  for (const cc in numbersByCountryService) {
    delete numbersByCountryService[cc][id];
  }
  delete services[id];
  saveNumbers();
  saveServices();
  await ctx.editMessageText(`✅ *Service Deleted*`, {
    reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_manage_services" }]] }
  });
});

/******************** ADMIN MANAGE COUNTRIES ********************/
bot.action("admin_manage_countries", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  await ctx.editMessageText(
    "🌍 *Manage Countries*",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Add Country", callback_data: "admin_add_country" }],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

bot.action("admin_add_country", async (ctx) => {
  ctx.session.adminState = "waiting_add_country";
  await ctx.editMessageText("Send: `[code] [name] [flag]`\nExample: `880 Bangladesh 🇧🇩`", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
  });
});

/******************** ADMIN ADD NUMBERS ********************/
bot.action("admin_add_numbers", async (ctx) => {
  ctx.session.adminState = "waiting_add_numbers";
  await ctx.editMessageText(
    "Send numbers in format:\n`[number]|[country]|[service]`\n\nExample:\n`8801712345678|880|whatsapp`",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
    }
  );
});

/******************** ADMIN UPLOAD FILE ********************/
bot.action("admin_upload", async (ctx) => {
  ctx.session.adminState = "waiting_upload";
  const buttons = [];
  for (const [id, s] of Object.entries(services)) {
    buttons.push([{ text: `${s.icon} ${s.name}`, callback_data: `admin_select_service:${id}` }]);
  }
  buttons.push([{ text: "❌ Cancel", callback_data: "admin_cancel" }]);
  await ctx.editMessageText("Select service for upload:", {
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_select_service:(.+)$/, async (ctx) => {
  ctx.session.adminState = "waiting_upload_file";
  ctx.session.adminData = { serviceId: ctx.match[1] };
  await ctx.editMessageText("Send .txt file with numbers (one per line)", {
    reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
  });
});

/******************** ADMIN BROADCAST ********************/
bot.action("admin_broadcast", async (ctx) => {
  ctx.session.adminState = "waiting_broadcast";
  await ctx.editMessageText("Send message to broadcast:", {
    reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel" }]] }
  });
});

/******************** ERROR HANDLER ********************/
bot.catch((err, ctx) => {
  console.error(`❌ Bot error:`, err);
});

/******************** START BOT ********************/
async function startBot() {
  try {
    console.log("=====================================");
    console.log("🚀 Starting Number Bot...");
    console.log("📢 Main Channel ID:", MAIN_CHANNEL_ID);
    console.log("📨 OTP Group ID:", OTP_GROUP_ID);
    console.log("⚙️ Default Number Count:", settings.defaultNumberCount);
    console.log("🤖 OTP System:", settings.otpSettings.enabled ? "ENABLED" : "DISABLED");
    console.log("=====================================");

    await bot.launch();
    console.log("✅ Bot started successfully!");
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    setTimeout(startBot, 10000);
  }
}

startBot();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));