/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAFYIja3-uFmDblVY74_jR9tn6jQhvSBqMk";
const ADMIN_PASSWORD = "sadhin8miya6145";
const SUPER_ADMIN_ID = "7095358778"; // আপনার টেলিগ্রাম আইডি

/******************** INITIALIZE BOT ********************/
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN not set correctly");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

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
  otpGroupId: -1003007557624, // OTP গ্রুপের ID
  otpGroupLink: "https://t.me/Spideyhuntotp",
  requireVerification: true,
  mainChannel: "@blackotpnum",
  mainChannelId: "-1003306722311", // মেইন চ্যানেলের ID
  chatGroup: "https://t.me/EarningHub6112",
  chatGroupId: -1003247504066 // চ্যাট গ্রুপের ID
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

/******************** LOAD DATA ********************/
// Countries data
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

// Services data
let services = {
  "whatsapp": { name: "WhatsApp", icon: "📱" },
  "telegram": { name: "Telegram", icon: "✈️" },
  "facebook": { name: "Facebook", icon: "📘" },
  "instagram": { name: "Instagram", icon: "📸" },
  "google": { name: "Google", icon: "🔍" },
  "verification": { name: "Verification", icon: "✅" },
  "other": { name: "Other", icon: "🔧" }
};

if (fs.existsSync(SERVICES_FILE)) {
  try {
    services = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading services:", e);
  }
} else {
  saveServices();
}

// Numbers data
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

// Users data
let users = {};
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading users:", e);
    users = {};
  }
}

// Active numbers data
let activeNumbers = {};
if (fs.existsSync(ACTIVE_NUMBERS_FILE)) {
  try {
    activeNumbers = JSON.parse(fs.readFileSync(ACTIVE_NUMBERS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading active numbers:", e);
    activeNumbers = {};
  }
}

// OTP log data
let otpLog = [];
if (fs.existsSync(OTP_LOG_FILE)) {
  try {
    otpLog = JSON.parse(fs.readFileSync(OTP_LOG_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading OTP log:", e);
    otpLog = [];
  }
}

// Admins data
let admins = [];
if (fs.existsSync(ADMINS_FILE)) {
  try {
    admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading admins:", e);
    admins = [SUPER_ADMIN_ID];
  }
} else {
  admins = [SUPER_ADMIN_ID];
  saveAdmins();
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

function isSuperAdmin(userId) {
  return userId.toString() === SUPER_ADMIN_ID;
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

function detectService(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes("whatsapp") || lower.includes("wa")) return "whatsapp";
  if (lower.includes("telegram") || lower.includes("tg")) return "telegram";
  if (lower.includes("facebook") || lower.includes("fb")) return "facebook";
  if (lower.includes("instagram") || lower.includes("ig")) return "instagram";
  if (lower.includes("google") || lower.includes("gmail")) return "google";
  if (lower.includes("verification") || lower.includes("verify") || lower.includes("code") || lower.includes("otp")) return "verification";
  
  return "other";
}

function extractOTP(text) {
  const patterns = [
    /\b(\d{6})\b/,
    /\b(\d{5})\b/,
    /\b(\d{4})\b/,
    /code[:\s]*(\d{4,6})/i,
    /otp[:\s]*(\d{4,6})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return "N/A";
}

function extractPhoneNumberFromMessage(text) {
  if (!text) return null;
  
  const patterns = [
    /Number[^\d]*»[^\d]*(\d{4}[\★\*]{3,}\d{4})/,
    /☎️[^\d]*»[^\d]*(\d{4}[\★\*]{3,}\d{4})/,
    /(\d{4}[\★\*]{3,}\d{4})/,
    /(\d{10,15})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let number = match[1] || match[0];
      number = number.replace(/[\★\*\s\-]/g, '');
      if (/^\d{10,15}$/.test(number)) {
        return number;
      }
    }
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

/******************** VERIFICATION FUNCTION (৩টি গ্রুপ চেক করবে) ********************/
async function checkUserMembership(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check Main Channel
    let isMainChannelMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(settings.mainChannelId, userId);
      isMainChannelMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      console.log(`Main Channel check for ${userId}: ${isMainChannelMember}`);
    } catch (error) {
      console.log("Error checking main channel:", error.message);
    }
    
    // Check Chat Group
    let isChatGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(settings.chatGroupId, userId);
      isChatGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      console.log(`Chat Group check for ${userId}: ${isChatGroupMember}`);
    } catch (error) {
      console.log("Error checking chat group:", error.message);
    }
    
    // Check OTP Group (নতুন যোগ করা)
    let isOTPGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(settings.otpGroupId, userId);
      isOTPGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      console.log(`OTP Group check for ${userId}: ${isOTPGroupMember}`);
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
        verified: false
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
          resize_keyboard: true
        }
      }
    );
  } catch (error) {
    console.error("Error showing main menu:", error);
  }
}

/******************** START COMMAND (৩টি গ্রুপ দেখাবে) ********************/
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
      "1️⃣ 📢 *Main Channel:* " + settings.mainChannel + "\n" +
      "2️⃣ 💬 *Chat Group:* Smart Earning Hub\n" +
      "3️⃣ 📨 *OTP Group:* @Spideyhuntotp\n\n" +
      "👇 Click the buttons below to join:",
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "1️⃣ 📢 Main Channel", url: "https://t.me/" + settings.mainChannel.replace("@", "") }
            ],
            [
              { text: "2️⃣ 💬 Chat Group", url: settings.chatGroup }
            ],
            [
              { text: "3️⃣ 📨 OTP Group", url: settings.otpGroupLink }
            ],
            [
              { text: "✅ VERIFY MEMBERSHIP", callback_data: "verify_user" }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Start command error:", error);
  }
});

/******************** VERIFICATION (৩টি গ্রুপ চেক করবে) ********************/
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

/******************** VERIFICATION CHECK MIDDLEWARE (কঠিন সিকিউরিটি) ********************/
bot.use(async (ctx, next) => {
  // Skip verification for start, adminlogin, verify button
  if (ctx.message?.text?.startsWith('/start') || 
      ctx.message?.text?.startsWith('/adminlogin') ||
      ctx.callbackQuery?.data === 'verify_user' ||
      ctx.session?.isAdmin) {
    return next();
  }
  
  // If verification is disabled in settings, allow access
  if (!settings.requireVerification) {
    return next();
  }
  
  // Check if user is verified in session
  if (ctx.from && !ctx.session?.verified) {
    const now = Date.now();
    
    // If verified within last 24 hours, allow
    if (ctx.session?.lastVerificationCheck && (now - ctx.session.lastVerificationCheck) < 24 * 60 * 60 * 1000) {
      return next();
    }
    
    // Check membership again
    const membership = await checkUserMembership(ctx);
    
    if (membership.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = now;
      return next();
    } else {
      // User not verified - BLOCK ACCESS
      await ctx.reply(
        "⛔ *ACCESS DENIED*\n\n" +
        "You must join ALL 3 required groups to use this bot.\n\n" +
        "Please click /start to join the groups and verify.",
        { parse_mode: "Markdown" }
      );
      return; // STOP here - user cannot proceed
    }
  }
  
  return next();
});

/******************** GET NUMBERS (একাধিক নাম্বার) ********************/
bot.hears("📞 Get Numbers", async (ctx) => {
  // কঠিন সিকিউরিটি - ভেরিফাইড না হলে ব্লক
  if (settings.requireVerification && !ctx.session.verified && !ctx.session.isAdmin) {
    return await ctx.reply("⛔ Access denied. You must join all 3 groups first. Use /start");
  }
  
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
    
    const service = services[serviceId];
    
    countryButtons.push([
      { text: "🔙 Back to Services", callback_data: "back_to_services" }
    ]);
    
    await ctx.editMessageText(
      `🌍 *Select Country for ${service.icon} ${service.name}*\n\n` +
      "Choose a country to get numbers from:",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: countryButtons }
      }
    );
    
  } catch (error) {
    console.error("Service selection error:", error);
    await ctx.answerCbQuery("❌ Error selecting service", { show_alert: true });
  }
});

/******************** COUNTRY SELECTION (একাধিক নাম্বার) ********************/
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
    
    // Clear previous numbers if any
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
    
    const country = countries[countryCode];
    const service = services[serviceId];
    
    let numbersText = "";
    numbers.forEach((num, index) => {
      numbersText += `${index + 1}. \`+${num}\`\n`;
    });
    
    const message = 
      `✅ *${numbers.length} Numbers Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n\n` +
      `📞 *Numbers:*\n${numbersText}\n\n` +
      `👇 *Copy numbers by tapping on them*`;
    
    const sentMessage = await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: "📨 OTP Group", 
              url: settings.otpGroupLink 
            }
          ],
          [
            { 
              text: "🔄 Get New Numbers", 
              callback_data: `get_new_numbers:${serviceId}:${countryCode}` 
            }
          ],
          [
            {
              text: "🔙 Back to Services",
              callback_data: "back_to_services"
            }
          ]
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

/******************** GET NEW NUMBERS (একাধিক নাম্বার) ********************/
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
    
    const country = countries[countryCode];
    const service = services[serviceId];
    
    let numbersText = "";
    numbers.forEach((num, index) => {
      numbersText += `${index + 1}. \`+${num}\`\n`;
    });
    
    const message = 
      `✅ *${numbers.length} New Numbers Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n\n` +
      `📞 *Numbers:*\n${numbersText}\n\n` +
      `👇 *Copy numbers by tapping on them*`;
    
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: "📨 OTP Group", 
              url: settings.otpGroupLink 
            }
          ],
          [
            { 
              text: "🔄 Get New Numbers", 
              callback_data: `get_new_numbers:${serviceId}:${countryCode}` 
            }
          ],
          [
            {
              text: "🔙 Back to Services",
              callback_data: "back_to_services"
            }
          ]
        ]
      }
    });
    
  } catch (error) {
    console.error("Get new numbers error:", error);
    await ctx.answerCbQuery("❌ Error", { show_alert: true });
  }
});

/******************** CHANGE NUMBERS (একাধিক নাম্বার) ********************/
bot.hears("🔄 Change Numbers", async (ctx) => {
  // কঠিন সিকিউরিটি - ভেরিফাইড না হলে ব্লক
  if (settings.requireVerification && !ctx.session.verified && !ctx.session.isAdmin) {
    return await ctx.reply("⛔ Access denied. You must join all 3 groups first. Use /start");
  }
  
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
  
  const country = countries[countryCode];
  const service = services[serviceId];
  
  let numbersText = "";
  numbers.forEach((num, index) => {
    numbersText += `${index + 1}. \`+${num}\`\n`;
  });
  
  const message = 
    `✅ *${numbers.length} New Numbers Received!*\n\n` +
    `📱 *Service:* ${service.name}\n` +
    `${country.flag} *Country:* ${country.name}\n\n` +
    `📞 *Numbers:*\n${numbersText}\n\n` +
    `👇 *Copy numbers by tapping on them*`;
  
  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: "📨 OTP Group", 
            url: settings.otpGroupLink 
          }
        ],
        [
          { 
            text: "🔄 Get New Numbers", 
            callback_data: `get_new_numbers:${serviceId}:${countryCode}` 
          }
        ],
        [
          {
            text: "🔙 Back to Services",
            callback_data: "back_to_services"
          }
        ]
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
      "🎯 *Select Service*\n\n" +
      "Choose the service you need numbers for:",
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
  // কঠিন সিকিউরিটি - ভেরিফাইড না হলে ব্লক
  if (settings.requireVerification && !ctx.session.verified && !ctx.session.isAdmin) {
    return await ctx.reply("⛔ Access denied. You must join all 3 groups first. Use /start");
  }
  
  await ctx.reply(
    "📖 *Bot Help*\n\n" +
    "• 📞 *Get Numbers* - Get new numbers (count set by admin)\n" +
    "• 🔄 *Change Numbers* - Get new set of numbers\n" +
    "• 🏠 *Main Menu* - Return to main menu\n\n" +
    "🔐 *Verification:* You must join all 3 groups to use this bot.\n\n" +
    "Admin commands: /adminlogin",
    { parse_mode: "Markdown" }
  );
});

/******************** MAIN MENU ********************/
bot.hears("🏠 Main Menu", async (ctx) => {
  // কঠিন সিকিউরিটি - ভেরিফাইড না হলেও মেনু দেখাবে? না, ব্লক করবো
  if (settings.requireVerification && !ctx.session.verified && !ctx.session.isAdmin) {
    return await ctx.reply("⛔ Access denied. You must join all 3 groups first. Use /start");
  }
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
      ]
    ];
    
    if (isSuperAdmin(ctx.from.id.toString())) {
      buttons.push([
        { text: "👑 Promote Admin", callback_data: "admin_promote" },
        { text: "👑 Demote Admin", callback_data: "admin_demote" }
      ]);
      buttons.push([
        { text: "👑 Admin List", callback_data: "admin_list" }
      ]);
    }
    
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

// অ্যাডমিন প্যানেলের বাকি ফাংশনগুলো আগের মতোই থাকবে...
// (এখানে admin_stock, admin_users, admin_otp_log, admin_broadcast, 
// admin_add_numbers, admin_upload, admin_manage_services, admin_manage_countries,
// admin_add_country, admin_add_service, admin_delete_service, admin_list_services,
// admin_delete, admin_delete_confirm, admin_delete_execute, admin_settings,
// admin_set_count, admin_set_cooldown, admin_toggle_verification,
// admin_set_otp_group_id, admin_set_otp_link, admin_promote, admin_demote,
// admin_list, admin_logout, admin_back, admin_cancel, text handler,
// file upload handler ফাংশনগুলো আগের মতোই থাকবে)

/******************** OTP GROUP MONITORING (মাস্ক করা নাম্বার) ********************/
bot.on("message", async (ctx) => {
  try {
    if (ctx.chat.id !== settings.otpGroupId) return;
    
    const messageText = ctx.message.text || ctx.message.caption || '';
    const messageId = ctx.message.message_id;
    
    if (!messageText) return;
    
    console.log(`📨 OTP Group Message [${messageId}]: ${messageText.substring(0, 100)}...`);
    
    let extractedNumber = extractPhoneNumberFromMessage(messageText);
    
    if (!extractedNumber) {
      const allActiveNumbers = Object.keys(activeNumbers);
      for (const activeNumber of allActiveNumbers) {
        const last4 = activeNumber.slice(-4);
        if (messageText.includes(last4)) {
          console.log(`✅ Found number by last 4 digits: ${activeNumber}`);
          extractedNumber = activeNumber;
          break;
        }
      }
    }
    
    if (!extractedNumber) {
      console.log("❌ No phone number found in message");
      return;
    }
    
    console.log(`📞 Phone number found: ${extractedNumber}`);
    
    if (!activeNumbers[extractedNumber]) {
      console.log(`❌ No active user for number: ${extractedNumber}`);
      return;
    }
    
    const userData = activeNumbers[extractedNumber];
    const userId = userData.userId;
    
    const result = await ctx.telegram.forwardMessage(userId, settings.otpGroupId, messageId);
    
    if (result) {
      console.log(`✅ OTP forwarded to user ${userId}`);
      
      const country = getCountryFromNumber(extractedNumber);
      const service = detectService(messageText);
      const maskedNumber = maskPhoneNumber(extractedNumber);
      const otp = extractOTP(messageText);
      
      const formattedMessage = 
        `🔔 *New OTP Received*\n\n` +
        `📞 *Number:* \`${maskedNumber}\`\n` +
        `🔑 *Code:* \`${otp}\`\n` +
        `🏆 *Service:* ${services[service]?.icon || '📱'} ${services[service]?.name || service}\n` +
        `🌎 *Country:* ${country.name} ${country.flag}\n` +
        `⏳ *Time:* ${new Date().toLocaleString()}\n\n` +
        `💬 *Message:*\n${messageText}`;
      
      await ctx.telegram.sendMessage(userId, formattedMessage, { parse_mode: "Markdown" });
      
      otpLog.push({
        phoneNumber: extractedNumber,
        userId,
        messageId,
        delivered: true,
        timestamp: new Date().toISOString()
      });
      saveOTPLog();
    } else {
      console.log(`❌ Failed to forward OTP to user ${userId}`);
    }
    
  } catch (error) {
    console.error("OTP monitoring error:", error);
  }
});

/******************** ERROR HANDLER ********************/
bot.catch((err, ctx) => {
  console.error(`❌ Bot error for ${ctx.updateType}:`, err);
});

/******************** START BOT ********************/
async function startBot() {
  try {
    console.log("=====================================");
    console.log("🚀 Starting Number Bot with 3-Group Verification...");
    console.log("🤖 Bot Token: [HIDDEN]");
    console.log("🔑 Admin Password: [HIDDEN]");
    console.log("👑 Super Admin ID: " + SUPER_ADMIN_ID);
    console.log("📢 Main Channel ID: " + settings.mainChannelId);
    console.log("💬 Chat Group ID: " + settings.chatGroupId);
    console.log("📨 OTP Group ID: " + settings.otpGroupId);
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