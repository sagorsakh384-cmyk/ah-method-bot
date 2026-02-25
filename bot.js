/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAFYIja3-uFmDblVY74_jR9tn6jQhvSBqMk";
const ADMIN_PASSWORD = "sadhin8miya6145";
const SUPER_ADMIN_ID = "7095358778"; // আপনার টেলিগ্রাম আইডি দিন

const MAIN_CHANNEL = "@blackotpnum";
const MAIN_CHANNEL_ID = "@blackotpnum";
const CHAT_GROUP = "https://t.me/EarningHub6112";
const CHAT_GROUP_ID = -1003247504066;
const OTP_GROUP = "https://t.me/Spideyhuntotp";
const OTP_GROUP_ID = -1003007557624;

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
  defaultNumberCount: 1, // ইউজার কয়টি নাম্বার পাবে (অ্যাডমিন সেট করবে)
  cooldownSeconds: 5, // কত সেকেন্ড পর পর নতুন নাম্বার নেওয়া যাবে
  requireVerification: true // ভেরিফিকেশন চাই কি না
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

/******************** DATA ********************/
// Load countries
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

// Load services
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

// Load numbers
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

// Load users
let users = {};
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading users:", e);
    users = {};
  }
}

// Load active numbers
let activeNumbers = {};
if (fs.existsSync(ACTIVE_NUMBERS_FILE)) {
  try {
    activeNumbers = JSON.parse(fs.readFileSync(ACTIVE_NUMBERS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading active numbers:", e);
    activeNumbers = {};
  }
}

// Load OTP log
let otpLog = [];
if (fs.existsSync(OTP_LOG_FILE)) {
  try {
    otpLog = JSON.parse(fs.readFileSync(OTP_LOG_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading OTP log:", e);
    otpLog = [];
  }
}

// Load admins
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
  
  // Check if user is admin
  if (ctx.from && !ctx.session.isAdmin) {
    ctx.session.isAdmin = isAdmin(ctx.from.id.toString());
  }
  
  return next();
});

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
      "🤖 *Welcome to Multi-Number Bot*\n\n" +
      "🔐 *Verification Required*\n" +
      "To use this bot, you must join all required groups first:\n\n" +
      "📢 *Main Channel:* @blackotpnum\n" +
      "💬 *Chat Group:* " + CHAT_GROUP + "\n" +
      "📨 *OTP Group:* " + OTP_GROUP + "\n\n" +
      "After joining all groups, click the verify button below:",
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📢 Main Channel", url: "https://t.me/blackotpnum" }
            ],
            [
              { text: "💬 Join Chat Group", url: CHAT_GROUP }
            ],
            [
              { text: "📨 Join OTP Group", url: OTP_GROUP }
            ],
            [
              { text: "✅ Verify Membership", callback_data: "verify_user" }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Start command error:", error);
  }
});

async function showMainMenu(ctx) {
  await ctx.reply(
    "🏠 *Main Menu*\n\n" +
    "Choose an option:",
    {
      parse_mode: "Markdown",
      reply_markup: Markup.keyboard([
        ["📞 Get Numbers", "🔄 Change Numbers"],
        ["📋 My Numbers", "ℹ️ Help"],
        ["🏠 Main Menu"]
      ]).resize()
    }
  );
}

/******************** VERIFICATION ********************/
bot.action("verify_user", async (ctx) => {
  try {
    await ctx.answerCbQuery("⏳ Checking membership...");
    
    const membership = await checkUserMembership(ctx);
    
    if (membership.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = Date.now();
      
      if (users[ctx.from.id]) {
        users[ctx.from.id].verified = true;
        saveUsers();
      }
      
      await ctx.editMessageText(
        "✅ *Verification Successful!*\n\n" +
        "You have joined all required groups and can now use all bot features.",
        { parse_mode: "Markdown" }
      );
      
      await showMainMenu(ctx);
      
    } else {
      let notJoinedMsg = "❌ *Verification Failed*\n\nYou haven't joined the following groups:\n";
      
      if (!membership.mainChannel) notJoinedMsg += "• 📢 Main Channel\n";
      if (!membership.chatGroup) notJoinedMsg += "• 💬 Chat Group\n";
      if (!membership.otpGroup) notJoinedMsg += "• 📨 OTP Group\n";
      
      notJoinedMsg += "\nPlease join all required groups and try again.";
      
      await ctx.editMessageText(notJoinedMsg, { parse_mode: "Markdown" });
    }
    
  } catch (error) {
    console.error("Verification error:", error);
    await ctx.answerCbQuery("❌ Verification failed", { show_alert: true });
  }
});

/******************** VERIFICATION CHECK MIDDLEWARE ********************/
bot.use(async (ctx, next) => {
  if (ctx.message?.text?.startsWith('/start') || 
      ctx.message?.text?.startsWith('/adminlogin') ||
      ctx.callbackQuery?.data === 'verify_user' ||
      ctx.session?.isAdmin ||
      !settings.requireVerification) {
    return next();
  }
  
  if (ctx.from && !ctx.session?.verified) {
    const now = Date.now();
    if (ctx.session?.lastVerificationCheck && (now - ctx.session.lastVerificationCheck) < 24 * 60 * 60 * 1000) {
      return next();
    }
    
    const membership = await checkUserMembership(ctx);
    
    if (membership.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = now;
      return next();
    } else {
      await ctx.reply(
        "❌ *Verification Required*\n\n" +
        "You need to join all required groups to use this bot.\n" +
        "Please use /start to verify.",
        { parse_mode: "Markdown" }
      );
      return;
    }
  }
  
  return next();
});

/******************** GET NUMBERS ********************/
bot.hears("📞 Get Numbers", async (ctx) => {
  if (settings.requireVerification && !ctx.session.verified && !ctx.session.isAdmin) {
    return await ctx.reply("❌ Please verify first. Use /start");
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
              url: OTP_GROUP 
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
              url: OTP_GROUP 
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

/******************** MY NUMBERS ********************/
bot.hears("📋 My Numbers", async (ctx) => {
  if (ctx.session.currentNumbers.length === 0) {
    return await ctx.reply("📭 You don't have any active numbers. Use '📞 Get Numbers' first.");
  }
  
  let numbersText = "";
  ctx.session.currentNumbers.forEach((num, index) => {
    numbersText += `${index + 1}. \`+${num}\`\n`;
  });
  
  await ctx.reply(
    `📋 *Your Active Numbers:*\n\n${numbersText}`,
    { parse_mode: "Markdown" }
  );
});

/******************** CHANGE NUMBERS ********************/
bot.hears("🔄 Change Numbers", async (ctx) => {
  if (ctx.session.currentNumbers.length === 0) {
    return await ctx.reply("❌ You don't have any active numbers. Use '📞 Get Numbers' first.");
  }
  
  // Clear current numbers
  ctx.session.currentNumbers.forEach(num => {
    if (activeNumbers[num]) {
      delete activeNumbers[num];
    }
  });
  saveActiveNumbers();
  ctx.session.currentNumbers = [];
  
  await ctx.reply("✅ Your numbers have been cleared. Use '📞 Get Numbers' to get new ones.");
});

/******************** HELP ********************/
bot.hears("ℹ️ Help", async (ctx) => {
  await ctx.reply(
    "📖 *Bot Help*\n\n" +
    "• 📞 *Get Numbers* - Get new numbers (count set by admin)\n" +
    "• 🔄 *Change Numbers* - Clear your current numbers\n" +
    "• 📋 *My Numbers* - View your active numbers\n" +
    "• 🏠 *Main Menu* - Return to main menu\n\n" +
    "Admin commands: /adminlogin",
    { parse_mode: "Markdown" }
  );
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
    
    // Super admin only commands
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

/******************** SET NUMBER COUNT ********************/
bot.action("admin_settings", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  ctx.session.adminState = "waiting_set_count";
  
  await ctx.editMessageText(
    "⚙️ *Bot Settings*\n\n" +
    `Current number count: *${settings.defaultNumberCount}*\n` +
    `Current cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `Verification required: *${settings.requireVerification ? "Yes" : "No"}*\n\n` +
    "Send the new number count (e.g., 5):",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⏱ Set Cooldown", callback_data: "admin_set_cooldown" },
            { text: "🔓 Toggle Verification", callback_data: "admin_toggle_verification" }
          ],
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

bot.action("admin_set_cooldown", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  ctx.session.adminState = "waiting_set_cooldown";
  
  await ctx.editMessageText(
    `⏱ *Set Cooldown*\n\n` +
    `Current cooldown: *${settings.cooldownSeconds} seconds*\n\n` +
    `Send the new cooldown in seconds (e.g., 10):`,
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  settings.requireVerification = !settings.requireVerification;
  saveSettings();
  
  await ctx.answerCbQuery(`✅ Verification ${settings.requireVerification ? "enabled" : "disabled"}`);
  
  // Refresh settings menu
  ctx.session.adminState = "waiting_set_count";
  await ctx.editMessageText(
    "⚙️ *Bot Settings*\n\n" +
    `Current number count: *${settings.defaultNumberCount}*\n` +
    `Current cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `Verification required: *${settings.requireVerification ? "Yes" : "No"}*\n\n` +
    "Send the new number count (e.g., 5):",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⏱ Set Cooldown", callback_data: "admin_set_cooldown" },
            { text: "🔓 Toggle Verification", callback_data: "admin_toggle_verification" }
          ],
          [{ text: "❌ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN STOCK REPORT ********************/
bot.action("admin_stock", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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

/******************** ADMIN USER STATS ********************/
bot.action("admin_users", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
});

/******************** ADMIN OTP LOG ********************/
bot.action("admin_otp_log", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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

/******************** ADMIN ADD NUMBERS MANUALLY ********************/
bot.action("admin_add_numbers", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  const serviceId = ctx.match[1];
  const service = services[serviceId];
  
  ctx.session.adminState = "waiting_upload_file";
  ctx.session.adminData = { serviceId: serviceId };
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  await ctx.editMessageText(
    "🌍 *Manage Countries*\n\n" +
    "Select an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "➕ Add Country", callback_data: "admin_add_country" }
          ],
          [{ text: "🔙 Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN ADD COUNTRY ********************/
bot.action("admin_add_country", async (ctx) => {
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  const serviceId = ctx.match[1];
  
  // Delete service from all countries
  for (const countryCode in numbersByCountryService) {
    if (numbersByCountryService[countryCode][serviceId]) {
      delete numbersByCountryService[countryCode][serviceId];
    }
  }
  
  // Delete service from services list
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
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
  if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Admin only");
  }
  
  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];
  
  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;
  
  delete numbersByCountryService[countryCode][serviceId];
  
  // If no services left for this country, remove country
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

/******************** ADMIN PROMOTE ********************/
bot.action("admin_promote", async (ctx) => {
  if (!isSuperAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Super Admin only");
  }
  
  ctx.session.adminState = "waiting_promote";
  
  await ctx.editMessageText(
    "👑 *Promote to Admin*\n\n" +
    "Send the user ID to promote:\n" +
    "Example: `123456789`",
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

/******************** ADMIN DEMOTE ********************/
bot.action("admin_demote", async (ctx) => {
  if (!isSuperAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Super Admin only");
  }
  
  ctx.session.adminState = "waiting_demote";
  
  await ctx.editMessageText(
    "👑 *Demote Admin*\n\n" +
    "Send the user ID to demote:\n" +
    "Example: `123456789`",
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

/******************** ADMIN LIST ********************/
bot.action("admin_list", async (ctx) => {
  if (!isSuperAdmin(ctx.from.id.toString())) {
    return await ctx.answerCbQuery("❌ Super Admin only");
  }
  
  let message = "👑 *Admin List*\n\n";
  
  for (const adminId of admins) {
    if (adminId === SUPER_ADMIN_ID) {
      message += `👑 \`${adminId}\` — Super Admin\n`;
    } else {
      message += `👥 \`${adminId}\` — Admin\n`;
    }
  }
  
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
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

/******************** TEXT HANDLER FOR ADMIN ********************/
bot.on("text", async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text) {
      return;
    }
    
    // Handle admin text commands
    if (ctx.session.isAdmin && ctx.session.adminState) {
      const adminState = ctx.session.adminState;
      const text = ctx.message.text;
      
      if (adminState === "waiting_set_count") {
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
          `📢 *Broadcast Complete!*\n\n` +
          `✅ Sent: ${sent} users\n` +
          `❌ Failed: ${failed} users`,
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
        
        await ctx.reply(
          `✅ *Numbers Added!*\n\n` +
          `✅ Added: ${added}\n` +
          `❌ Failed: ${failed}`,
          { parse_mode: "Markdown" }
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
          
          await ctx.reply(
            `✅ *Country Added Successfully!*\n\n` +
            `📌 *Code:* +${countryCode}\n` +
            `🏳️ *Name:* ${countryName}\n` +
            `${flag} *Flag:* ${flag}`,
            { parse_mode: "Markdown" }
          );
          
          ctx.session.adminState = null;
        } else {
          await ctx.reply("❌ Invalid format. Use: `[code] [name] [flag]`", { parse_mode: "Markdown" });
        }
        
      } else if (adminState === "waiting_add_service") {
        const parts = text.trim().split(/\s+/);
        if (parts.length >= 3) {
          const serviceId = parts[0].toLowerCase();
          const serviceName = parts.slice(1, -1).join(" ");
          const icon = parts[parts.length - 1];
          
          services[serviceId] = {
            name: serviceName,
            icon: icon
          };
          
          saveServices();
          
          await ctx.reply(
            `✅ *Service Added Successfully!*\n\n` +
            `📌 *ID:* \`${serviceId}\`\n` +
            `🔧 *Name:* ${serviceName}\n` +
            `${icon} *Icon:* ${icon}`,
            { parse_mode: "Markdown" }
          );
          
          ctx.session.adminState = null;
        } else {
          await ctx.reply("❌ Invalid format. Use: `[id] [name] [icon]`", { parse_mode: "Markdown" });
        }
        
      } else if (adminState === "waiting_promote") {
        if (!isSuperAdmin(ctx.from.id.toString())) {
          await ctx.reply("❌ Only Super Admin can promote.");
          return;
        }
        
        const targetId = text.trim();
        if (!targetId.match(/^\d+$/)) {
          await ctx.reply("❌ Invalid user ID format.");
          return;
        }
        
        if (admins.includes(targetId)) {
          await ctx.reply(`⚠️ User ${targetId} is already an admin.`);
        } else {
          admins.push(targetId);
          saveAdmins();
          await ctx.reply(`✅ User ${targetId} has been promoted to admin.`);
        }
        
        ctx.session.adminState = null;
        
      } else if (adminState === "waiting_demote") {
        if (!isSuperAdmin(ctx.from.id.toString())) {
          await ctx.reply("❌ Only Super Admin can demote.");
          return;
        }
        
        const targetId = text.trim();
        if (!targetId.match(/^\d+$/)) {
          await ctx.reply("❌ Invalid user ID format.");
          return;
        }
        
        if (targetId === SUPER_ADMIN_ID) {
          await ctx.reply("❌ Cannot demote Super Admin.");
          return;
        }
        
        const index = admins.indexOf(targetId);
        if (index === -1) {
          await ctx.reply(`🤔 User ${targetId} is not an admin.`);
        } else {
          admins.splice(index, 1);
          saveAdmins();
          await ctx.reply(`✅ User ${targetId} has been demoted from admin.`);
        }
        
        ctx.session.adminState = null;
      }
    }
  } catch (error) {
    console.error("Text handler error:", error);
  }
});

/******************** FILE UPLOAD HANDLER ********************/
bot.on("document", async (ctx) => {
  try {
    // Check if admin is waiting for file upload
    if (!ctx.session.isAdmin || ctx.session.adminState !== "waiting_upload_file") {
      return;
    }
    
    const document = ctx.message.document;
    
    // Check file type
    if (!document.file_name.toLowerCase().endsWith('.txt')) {
      await ctx.reply("❌ Please send only .txt files.");
      return;
    }
    
    await ctx.reply("📥 Downloading and processing file...");
    
    try {
      // Get file link
      const fileLink = await ctx.telegram.getFileLink(document.file_id);
      
      // Download file content using https module
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
      
      // Get service ID from session
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
      
      // Process file content
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
        
        // Validate number
        if (!/^\d{10,15}$/.test(number)) {
          invalid++;
          continue;
        }
        
        // Check country code
        if (!countryCode) {
          invalid++;
          continue;
        }
        
        // Add country if not exists
        if (!countries[countryCode]) {
          countries[countryCode] = {
            name: `Country ${countryCode}`,
            flag: "🏳️"
          };
        }
        
        // Initialize data structures
        numbersByCountryService[countryCode] = numbersByCountryService[countryCode] || {};
        numbersByCountryService[countryCode][serviceFromFile] = numbersByCountryService[countryCode][serviceFromFile] || [];
        
        // Add number if not duplicate
        if (!numbersByCountryService[countryCode][serviceFromFile].includes(number)) {
          numbersByCountryService[countryCode][serviceFromFile].push(number);
          added++;
        } else {
          skipped++;
        }
      }
      
      // Save data
      saveCountries();
      saveNumbers();
      
      // Reset session
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

/******************** OTP GROUP MONITORING ********************/
bot.on("message", async (ctx) => {
  try {
    // Check if this is from OTP group
    if (ctx.chat.id === OTP_GROUP_ID) {
      const messageText = ctx.message.text || ctx.message.caption || '';
      const messageId = ctx.message.message_id;
      
      if (!messageText) {
        return;
      }
      
      console.log(`📨 OTP Group Message [${messageId}]: ${messageText.substring(0, 100)}...`);
      
      // Extract phone number from message
      let extractedNumber = extractPhoneNumberFromMessage(messageText);
      
      // If no number found, try to match with active numbers
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
      
      // Check if this number is assigned to any user
      if (!activeNumbers[extractedNumber]) {
        console.log(`❌ No active user for number: ${extractedNumber}`);
        return;
      }
      
      // Forward the EXACT message to the user
      const userData = activeNumbers[extractedNumber];
      const userId = userData.userId;
      
      const result = await ctx.telegram.forwardMessage(userId, OTP_GROUP_ID, messageId);
      
      if (result) {
        console.log(`✅ OTP forwarded to user ${userId}`);
        
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
    console.log("🚀 Starting Multi-Number Bot...");
    console.log("🤖 Bot Token: [HIDDEN]");
    console.log("🔑 Admin Password: [HIDDEN]");
    console.log("👑 Super Admin ID: " + SUPER_ADMIN_ID);
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

// Start the bot
startBot();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));