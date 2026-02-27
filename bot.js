/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAFYIja3-uFmDblVY74_jR9tn6jQhvSBqMk";
const ADMIN_PASSWORD = "sadhin8miya6145";

// тЪая╕П IMPORTANT: ржирж┐ржЪрзЗрж░ ID ржЧрзБрж▓рзЛ ржЖржкржирж╛рж░ ржЖрж╕рж▓ ID ржжрж┐рзЯрзЗ ржкрж░рж┐ржмрж░рзНрждржи ржХрж░рзБржи тЪая╕П
// ID ржмрзЗрж░ ржХрж░рждрзЗ @getidsbot ржмрзНржпржмрж╣рж╛рж░ ржХрж░рзБржи
const MAIN_CHANNEL = "@blackotpnum";
const MAIN_CHANNEL_ID = "-1003306722311"; // ржЖржкржирж╛рж░ ржЪрзНржпрж╛ржирзЗрж▓рзЗрж░ рж╕ржарж┐ржХ numeric ID ржжрж┐ржи

const CHAT_GROUP = "https://t.me/EarningHub6112";
const CHAT_GROUP_ID = -1003247504066; // ржЖржкржирж╛рж░ ржЧрзНрж░рзБржкрзЗрж░ рж╕ржарж┐ржХ ID

const OTP_GROUP = "https://t.me/Spideyhuntotp";
const OTP_GROUP_ID = -1003007557624; // ржЖржкржирж╛рж░ OTP ржЧрзНрж░рзБржкрзЗрж░ рж╕ржарж┐ржХ ID

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
  requireVerification: true
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
  console.error("тЭМ BOT_TOKEN not set correctly");
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
    "880": { name: "Bangladesh", flag: "ЁЯЗзЁЯЗй" },
    "91": { name: "India", flag: "ЁЯЗоЁЯЗ│" },
    "92": { name: "Pakistan", flag: "ЁЯЗ╡ЁЯЗ░" },
    "1": { name: "USA", flag: "ЁЯЗ║ЁЯЗ╕" },
    "44": { name: "UK", flag: "ЁЯЗмЁЯЗз" },
    "977": { name: "Nepal", flag: "ЁЯЗ│ЁЯЗ╡" }
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
    "whatsapp": { name: "WhatsApp", icon: "ЁЯУ▒" },
    "telegram": { name: "Telegram", icon: "тЬИя╕П" },
    "facebook": { name: "Facebook", icon: "ЁЯУШ" },
    "instagram": { name: "Instagram", icon: "ЁЯУ╕" },
    "google": { name: "Google", icon: "ЁЯФН" },
    "verification": { name: "Verification", icon: "тЬЕ" },
    "other": { name: "Other", icon: "ЁЯФз" }
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

    console.log(`тЬЕ Loaded ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length} numbers`);
  } catch (e) {
    console.error("тЭМ Error loading numbers:", e);
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
    console.error("тЭМ Error saving settings:", error);
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
    console.error("тЭМ Error saving numbers:", error);
  }
}

function saveCountries() {
  try {
    fs.writeFileSync(COUNTRIES_FILE, JSON.stringify(countries, null, 2));
  } catch (error) {
    console.error("тЭМ Error saving countries:", error);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("тЭМ Error saving users:", error);
  }
}

function saveServices() {
  try {
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));
  } catch (error) {
    console.error("тЭМ Error saving services:", error);
  }
}

function saveActiveNumbers() {
  try {
    fs.writeFileSync(ACTIVE_NUMBERS_FILE, JSON.stringify(activeNumbers, null, 2));
  } catch (error) {
    console.error("тЭМ Error saving active numbers:", error);
  }
}

function saveOTPLog() {
  try {
    fs.writeFileSync(OTP_LOG_FILE, JSON.stringify(otpLog.slice(-1000), null, 2));
  } catch (error) {
    console.error("тЭМ Error saving OTP log:", error);
  }
}

function saveAdmins() {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error("тЭМ Error saving admins:", error);
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

  return { name: "Unknown", flag: "ЁЯП┤тАНтШая╕П" };
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

  return `${startPart}тУОтУДтУК${endPart}`;
}

function extractPhoneNumberFromMessage(text) {
  if (!text) return null;

  const patterns = [
    /Number[^\d]*┬╗[^\d]*(\d{4}[\тШЕ\*]{3,}\d{4})/,
    /тШОя╕П[^\d]*┬╗[^\d]*(\d{4}[\тШЕ\*]{3,}\d{4})/,
    /(\d{4}[\тШЕ\*]{3,}\d{4})/,
    /(\d{10,15})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let number = match[1] || match[0];
      number = number.replace(/[\тШЕ\*\s\-]/g, '');
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

/******************** VERIFICATION MIDDLEWARE ********************/
bot.use(async (ctx, next) => {
  if (ctx.session?.isAdmin) {
    return next();
  }

  if (ctx.message?.text?.startsWith('/start') || 
      ctx.message?.text?.startsWith('/adminlogin')) {
    return next();
  }

  if (ctx.callbackQuery?.data === 'verify_user') {
    return next();
  }

  if (!ctx.from) {
    return next();
  }

  if (!settings.requireVerification) {
    return next();
  }

  if (ctx.session?.verified) {
    return next();
  }

  const now = Date.now();
  if (ctx.session?.lastVerificationCheck && 
      (now - ctx.session.lastVerificationCheck) < 24 * 60 * 60 * 1000) {
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
      "тЫФ *Verification Required*\n\n" +
      "You must join ALL 3 required groups to use this bot:\n\n" +
      "1я╕ПтГг ЁЯУв *Main Channel:* @blackotpnum\n" +
      "2я╕ПтГг ЁЯТм *Chat Group:* Smart Earning Hub\n" +
      "3я╕ПтГг ЁЯУи *OTP Group:* @Spideyhuntotp\n\n" +
      "ЁЯСЙ Click /start to join and verify.",
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.log("Could not reply to user");
  }

  return;
});

/******************** SHOW MAIN MENU - рж░рж┐ржкрзНрж▓рж╛ржЗ ржмрж╛ржЯржи рж╕рж╣ (ржлрж┐ржХрзНрж╕ржб) ********************/
async function showMainMenu(ctx) {
  try {
    await ctx.reply(
      "ЁЯПа *Main Menu*\n\nChoose an option:",
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            ["ЁЯУЮ Get Numbers", "ЁЯФД Change Numbers"],
            ["тД╣я╕П Help", "ЁЯПа Main Menu"]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
  } catch (error) {
    console.error("Error showing main menu:", error);
    await ctx.reply("ЁЯПа Main Menu\n\nChoose an option:", {
      reply_markup: {
        keyboard: [
          ["ЁЯУЮ Get Numbers", "ЁЯФД Change Numbers"],
          ["тД╣я╕П Help", "ЁЯПа Main Menu"]
        ],
        resize_keyboard: true
      }
    });
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
      "ЁЯдЦ *Welcome to Number Bot*\n\n" +
      "ЁЯФР *VERIFICATION REQUIRED - 3 GROUPS*\n" +
      "To use this bot, you MUST join ALL three groups first:\n\n" +
      "1я╕ПтГг ЁЯУв *Main Channel:* @blackotpnum\n" +
      "2я╕ПтГг ЁЯТм *Chat Group:* Smart Earning Hub\n" +
      "3я╕ПтГг ЁЯУи *OTP Group:* @Spideyhuntotp\n\n" +
      "ЁЯСЗ Click the buttons below to join:",
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "1я╕ПтГг ЁЯУв Main Channel", url: "https://t.me/blackotpnum" }
            ],
            [
              { text: "2я╕ПтГг ЁЯТм Chat Group", url: CHAT_GROUP }
            ],
            [
              { text: "3я╕ПтГг ЁЯУи OTP Group", url: OTP_GROUP }
            ],
            [
              { text: "тЬЕ VERIFY MEMBERSHIP", callback_data: "verify_user" }
            ]
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
    await ctx.answerCbQuery("тП│ Checking all 3 groups...");

    const membership = await checkUserMembership(ctx);

    if (membership.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = Date.now();

      if (users[ctx.from.id]) {
        users[ctx.from.id].verified = true;
        saveUsers();
      }

      await ctx.editMessageText(
        "тЬЕ *VERIFICATION SUCCESSFUL!*\n\n" +
        "You have joined all 3 required groups.\n" +
        "You can now use all bot features.",
        { parse_mode: "Markdown" }
      );

      await showMainMenu(ctx);

    } else {
      let notJoinedMsg = "тЭМ *VERIFICATION FAILED*\n\nYou haven't joined the following groups:\n";

      if (!membership.mainChannel) notJoinedMsg += "тЭМ 1я╕ПтГг Main Channel\n";
      if (!membership.chatGroup) notJoinedMsg += "тЭМ 2я╕ПтГг Chat Group\n";
      if (!membership.otpGroup) notJoinedMsg += "тЭМ 3я╕ПтГг OTP Group\n";

      notJoinedMsg += "\nPlease join ALL three groups and click VERIFY again.";

      await ctx.editMessageText(notJoinedMsg, { parse_mode: "Markdown" });
    }

  } catch (error) {
    console.error("Verification error:", error);
    await ctx.answerCbQuery("тЭМ Verification failed", { show_alert: true });
  }
});

/******************** GET NUMBERS ********************/
bot.hears("ЁЯУЮ Get Numbers", async (ctx) => {
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
      "ЁЯУн *No Numbers Available*\n\n" +
      "Sorry, all numbers are currently in use.\n" +
      "Please try again later or contact admin.",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply(
    "ЁЯОп *Select Service*\n\n" +
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
      return await ctx.answerCbQuery("тЭМ No numbers for this service", { show_alert: true });
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
      { text: "ЁЯФЩ Back to Services", callback_data: "back_to_services" }
    ]);

    await ctx.editMessageText(
      `ЁЯМН *Select Country for ${service.icon} ${service.name}*\n\n` +
      "Choose a country to get numbers from:",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: countryButtons }
      }
    );

  } catch (error) {
    console.error("Service selection error:", error);
    await ctx.answerCbQuery("тЭМ Error selecting service", { show_alert: true });
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
      return await ctx.answerCbQuery(`тП│ Wait ${remaining}s`, { show_alert: true });
    }

    const numbers = getMultipleNumbersByCountryAndService(countryCode, serviceId, userId, numberCount);

    if (numbers.length === 0) {
      return await ctx.answerCbQuery(`тЭМ Not enough numbers available.`, { show_alert: true });
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

    const country = countries[countryCode];
    const service = services[serviceId];

    let numbersText = "";
    numbers.forEach((num, index) => {
      numbersText += `${index + 1}. \`+${num}\`\n`;
    });

    const message = 
      `тЬЕ *${numbers.length} Numbers Received!*\n\n` +
      `ЁЯУ▒ *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n\n` +
      `ЁЯУЮ *Numbers:*\n${numbersText}\n\n` +
      `ЁЯСЗ *Copy numbers by tapping on them*`;

    const sentMessage = await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: "ЁЯУи OTP Group", 
              url: OTP_GROUP 
            }
          ],
          [
            { 
              text: "ЁЯФД Get New Numbers", 
              callback_data: `get_new_numbers:${serviceId}:${countryCode}` 
            }
          ],
          [
            {
              text: "ЁЯФЩ Back to Services",
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
    await ctx.answerCbQuery("тЭМ Error getting numbers", { show_alert: true });
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
      return await ctx.answerCbQuery(`тП│ Wait ${remaining}s`, { show_alert: true });
    }

    const numbers = getMultipleNumbersByCountryAndService(countryCode, serviceId, userId, numberCount);

    if (numbers.length === 0) {
      return await ctx.answerCbQuery(`тЭМ Not enough numbers available.`, { show_alert: true });
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
      `тЬЕ *${numbers.length} New Numbers Received!*\n\n` +
      `ЁЯУ▒ *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n\n` +
      `ЁЯУЮ *Numbers:*\n${numbersText}\n\n` +
      `ЁЯСЗ *Copy numbers by tapping on them*`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: "ЁЯУи OTP Group", 
              url: OTP_GROUP 
            }
          ],
          [
            { 
              text: "ЁЯФД Get New Numbers", 
              callback_data: `get_new_numbers:${serviceId}:${countryCode}` 
            }
          ],
          [
            {
              text: "ЁЯФЩ Back to Services",
              callback_data: "back_to_services"
            }
          ]
        ]
      }
    });

  } catch (error) {
    console.error("Get new numbers error:", error);
    await ctx.answerCbQuery("тЭМ Error", { show_alert: true });
  }
});

/******************** CHANGE NUMBERS ********************/
bot.hears("ЁЯФД Change Numbers", async (ctx) => {
  if (ctx.session.currentNumbers.length === 0) {
    return await ctx.reply("тЭМ You don't have any active numbers. Use 'ЁЯУЮ Get Numbers' first.");
  }

  const now = Date.now();
  const timeSinceLast = now - ctx.session.lastNumberTime;
  const cooldown = settings.cooldownSeconds * 1000;

  if (timeSinceLast < cooldown) {
    const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
    return await ctx.reply(`тП│ Please wait ${remaining} seconds before changing numbers.`);
  }

  const serviceId = ctx.session.currentService;
  const countryCode = ctx.session.currentCountry;
  const userId = ctx.from.id.toString();

  const numbers = getMultipleNumbersByCountryAndService(countryCode, serviceId, userId, settings.defaultNumberCount);

  if (numbers.length === 0) {
    return await ctx.reply("тЭМ No more numbers available for this service/country.");
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
    `тЬЕ *${numbers.length} New Numbers Received!*\n\n` +
    `ЁЯУ▒ *Service:* ${service.name}\n` +
    `${country.flag} *Country:* ${country.name}\n\n` +
    `ЁЯУЮ *Numbers:*\n${numbersText}\n\n` +
    `ЁЯСЗ *Copy numbers by tapping on them*`;

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: "ЁЯУи OTP Group", 
            url: OTP_GROUP 
          }
        ],
        [
          { 
            text: "ЁЯФД Get New Numbers", 
            callback_data: `get_new_numbers:${serviceId}:${countryCode}` 
          }
        ],
        [
          {
            text: "ЁЯФЩ Back to Services",
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
      "ЁЯОп *Select Service*\n\n" +
      "Choose the service you need numbers for:",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: serviceButtons }
      }
    );
  } catch (error) {
    console.error("Back to services error:", error);
    await ctx.answerCbQuery("тЭМ Error", { show_alert: true });
  }
});

/******************** HELP ********************/
bot.hears("тД╣я╕П Help", async (ctx) => {
  await ctx.reply(
    "ЁЯУЦ *Bot Help*\n\n" +
    "тАв ЁЯУЮ *Get Numbers* - Get new numbers (count: " + settings.defaultNumberCount + ")\n" +
    "тАв ЁЯФД *Change Numbers* - Get new set of numbers\n" +
    "тАв ЁЯПа *Main Menu* - Return to main menu\n\n" +
    "ЁЯФР *Verification:* You must join all 3 groups to use this bot.\n\n" +
    "Admin commands: /adminlogin",
    { parse_mode: "Markdown" }
  );
});

/******************** MAIN MENU ********************/
bot.hears("ЁЯПа Main Menu", async (ctx) => {
  await showMainMenu(ctx);
});

/******************** ADMIN LOGIN ********************/
bot.command("adminlogin", async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');

    if (parts.length < 2) {
      return await ctx.reply("тЭМ Usage: /adminlogin [password]");
    }

    const password = parts[1];

    if (password === ADMIN_PASSWORD) {
      ctx.session.isAdmin = true;

      if (!admins.includes(ctx.from.id.toString())) {
        admins.push(ctx.from.id.toString());
        saveAdmins();
      }

      await ctx.reply(
        "тЬЕ *Admin Login Successful!*\n\n" +
        "You now have administrator privileges.\n" +
        "Use /admin to access admin panel.",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply("тЭМ Wrong password. Access denied.");
    }
  } catch (error) {
    console.error("Admin login error:", error);
    await ctx.reply("тЭМ Error during admin login.");
  }
});

/******************** ADMIN PANEL ********************/
bot.command("admin", async (ctx) => {
  try {
    if (!ctx.session.isAdmin && !isAdmin(ctx.from.id.toString())) {
      return await ctx.reply(
        "тЭМ *Admin Access Required*\n\n" +
        "Use /adminlogin [password] to login as admin.",
        { parse_mode: "Markdown" }
      );
    }

    const buttons = [
      [
        { text: "ЁЯУК Stock Report", callback_data: "admin_stock" },
        { text: "ЁЯСе User Stats", callback_data: "admin_users" }
      ],
      [
        { text: "ЁЯУв Broadcast", callback_data: "admin_broadcast" },
        { text: "ЁЯУЛ OTP Log", callback_data: "admin_otp_log" }
      ],
      [
        { text: "тЮХ Add Numbers", callback_data: "admin_add_numbers" },
        { text: "ЁЯУд Upload File", callback_data: "admin_upload" }
      ],
      [
        { text: "ЁЯЧСя╕П Delete Numbers", callback_data: "admin_delete" },
        { text: "ЁЯФз Manage Services", callback_data: "admin_manage_services" }
      ],
      [
        { text: "ЁЯМН Manage Countries", callback_data: "admin_manage_countries" },
        { text: "тЪЩя╕П Settings", callback_data: "admin_settings" }
      ]
    ];

    buttons.push([
      { text: "ЁЯЪк Logout", callback_data: "admin_logout" }
    ]);

    await ctx.reply(
      "ЁЯЫа *Admin Dashboard*\n\n" +
      "Select an option:",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      }
    );

  } catch (error) {
    console.error("Admin command error:", error);
    await ctx.reply("тЭМ Error accessing admin panel.");
  }
});

/******************** ADMIN STOCK REPORT ********************/
bot.action("admin_stock", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  let report = "ЁЯУК *Stock Report*\n\n";
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

  report += `\nЁЯУИ *Grand Total:* ${totalNumbers} numbers\n`;
  report += `ЁЯСе *Active Users:* ${Object.keys(activeNumbers).length}\n`;
  report += `ЁЯУи *OTPs Forwarded:* ${otpLog.length}`;

  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "ЁЯФД Refresh", callback_data: "admin_stock" }],
        [{ text: "ЁЯФЩ Back", callback_data: "admin_back" }]
      ]
    }
  });
});

/******************** ADMIN USER STATS (ржлрж┐ржХрзНрж╕ржб) ********************/
bot.action("admin_users", async (ctx) => {
  if (!ctx.session.isAdmin) {
    await ctx.answerCbQuery("тЭМ Admin only");
    return;
  }

  try {
    let message = "ЁЯСе *User Statistics*\n\n";

    const totalUsers = Object.keys(users).length;
    const activeUsers = Object.keys(activeNumbers).length;

    message += `ЁЯУК *Statistics:*\n`;
    message += `тАв Total Registered Users: ${totalUsers}\n`;
    message += `тАв Active Users (with numbers): ${activeUsers}\n`;
    message += `тАв Total OTPs Delivered: ${otpLog.length}\n\n`;

    if (totalUsers > 0) {
      message += `ЁЯУЛ *Recent Users (last 10):*\n`;

      const sortedUsers = Object.values(users)
        .sort((a, b) => new Date(b.last_active) - new Date(a.last_active))
        .slice(0, 10);

      for (const user of sortedUsers) {
        const timeAgo = getTimeAgo(new Date(user.last_active));
        message += `\nЁЯСд *${user.first_name}* ${user.last_name || ''}\n`;
        message += `ЁЯЖФ ID: ${user.id}\n`;
        message += `ЁЯУ▒ @${user.username || 'no_username'}\n`;
        message += `ЁЯХР Active: ${timeAgo}\n`;
      }
    } else {
      message += `ЁЯУн No users yet`;
    }

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "ЁЯФД Refresh", callback_data: "admin_users" }],
          [{ text: "ЁЯФЩ Back", callback_data: "admin_back" }]
        ]
      }
    });
  } catch (error) {
    console.error("Admin users error:", error);
    await ctx.answerCbQuery("тЭМ Error loading users");
  }
});

/******************** ADMIN OTP LOG ********************/
bot.action("admin_otp_log", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  let message = "ЁЯУЛ *Recent OTP Logs*\n\n";

  if (otpLog.length === 0) {
    message += "No OTPs forwarded yet.";
  } else {
    const recentLogs = otpLog.slice(-10).reverse();
    for (const log of recentLogs) {
      const timeAgo = getTimeAgo(new Date(log.timestamp));
      message += `ЁЯУЮ ${log.phoneNumber} тЖТ ЁЯСд ${log.userId}\n`;
      message += `ЁЯХР ${timeAgo}\n\n`;
    }
  }

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "ЁЯФД Refresh", callback_data: "admin_otp_log" }],
        [{ text: "ЁЯФЩ Back", callback_data: "admin_back" }]
      ]
    }
  });
});

/******************** ADMIN BROADCAST ********************/
bot.action("admin_broadcast", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  ctx.session.adminState = "waiting_broadcast";

  await ctx.editMessageText(
    "ЁЯУв *Broadcast Message*\n\n" +
    "Send the message you want to broadcast to all users.\n\n" +
    "*Note:* This will be sent to all registered users.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN ADD NUMBERS ********************/
bot.action("admin_add_numbers", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  ctx.session.adminState = "waiting_add_numbers";

  await ctx.editMessageText(
    "тЮХ *Add Numbers Manually*\n\n" +
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
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN UPLOAD FILE ********************/
bot.action("admin_upload", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

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

  serviceButtons.push([{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]);

  await ctx.editMessageText(
    "ЁЯУд *Upload Numbers*\n\n" +
    "Select service for the numbers:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: serviceButtons }
    }
  );
});

bot.action(/^admin_select_service:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  const serviceId = ctx.match[1];
  const service = services[serviceId];

  ctx.session.adminState = "waiting_upload_file";
  ctx.session.adminData = { serviceId };

  await ctx.editMessageText(
    `ЁЯУд *Upload Numbers for ${service.name}*\n\n` +
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
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN MANAGE SERVICES ********************/
bot.action("admin_manage_services", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  await ctx.editMessageText(
    "ЁЯФз *Manage Services*\n\n" +
    "Select an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "ЁЯУЛ List Services", callback_data: "admin_list_services" },
            { text: "тЮХ Add Service", callback_data: "admin_add_service" }
          ],
          [
            { text: "ЁЯЧСя╕П Delete Service", callback_data: "admin_delete_service" }
          ],
          [{ text: "ЁЯФЩ Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN MANAGE COUNTRIES ********************/
bot.action("admin_manage_countries", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  await ctx.editMessageText(
    "ЁЯМН *Manage Countries*\n\n" +
    "Select an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "тЮХ Add Country", callback_data: "admin_add_country" }
          ],
          [{ text: "ЁЯФЩ Back", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN ADD COUNTRY ********************/
bot.action("admin_add_country", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  ctx.session.adminState = "waiting_add_country";

  await ctx.editMessageText(
    "ЁЯМН *Add New Country*\n\n" +
    "Send in format:\n`[countryCode] [name] [flag]`\n\n" +
    "*Examples:*\n" +
    "`880 Bangladesh ЁЯЗзЁЯЗй`\n" +
    "`91 India ЁЯЗоЁЯЗ│`\n" +
    "`1 USA ЁЯЗ║ЁЯЗ╕`\n\n" +
    "Note: Country code is dialing code (without +).",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN ADD SERVICE ********************/
bot.action("admin_add_service", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  ctx.session.adminState = "waiting_add_service";

  await ctx.editMessageText(
    "ЁЯФз *Add New Service*\n\n" +
    "Send in format:\n`[service_id] [name] [icon]`\n\n" +
    "*Examples:*\n" +
    "`facebook Facebook ЁЯУШ`\n" +
    "`gmail Gmail ЁЯУз`\n" +
    "`instagram Instagram ЁЯУ╕`\n\n" +
    "Service ID should be lowercase without spaces.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

/******************** ADMIN DELETE SERVICE ********************/
bot.action("admin_delete_service", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

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

  serviceButtons.push([{ text: "тЭМ Cancel", callback_data: "admin_back" }]);

  await ctx.editMessageText(
    "ЁЯЧСя╕П *Delete Service*\n\n" +
    "Select service to delete:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: serviceButtons }
    }
  );
});

bot.action(/^admin_delete_service_confirm:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  const serviceId = ctx.match[1];
  const service = services[serviceId];

  await ctx.editMessageText(
    `тЪая╕П *Confirm Deletion*\n\n` +
    `Are you sure you want to delete service *${service.name}*?\n\n` +
    `This will also delete all numbers assigned to this service!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "тЬЕ Yes, Delete", callback_data: `admin_delete_service_execute:${serviceId}` },
            { text: "тЭМ Cancel", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

bot.action(/^admin_delete_service_execute:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

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
    `тЬЕ *Service Deleted Successfully!*\n\n` +
    `Service has been removed.`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "ЁЯФЩ Back to Admin", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN LIST SERVICES ********************/
bot.action("admin_list_services", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  let report = "ЁЯУЛ *Services List*\n\n";

  for (const serviceId in services) {
    const service = services[serviceId];
    report += `тАв ${service.icon} *${service.name}* (ID: \`${serviceId}\`)\n`;
  }

  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "ЁЯФЩ Back", callback_data: "admin_back" }]
      ]
    }
  });
});

/******************** ADMIN DELETE NUMBERS ********************/
bot.action("admin_delete", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  let report = "тЭМ *Delete Numbers*\n\n";
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
        report += `  ${service?.icon || 'ЁЯУЮ'} ${service?.name || serviceId}: ${count}\n`;

        buttons.push([
          { 
            text: `ЁЯЧСя╕П ${countryCode}/${serviceId} (${count})`, 
            callback_data: `admin_delete_confirm:${countryCode}:${serviceId}` 
          }
        ]);
      }
    }
    report += "\n";
  }

  buttons.push([{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]);

  await ctx.editMessageText(report, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_delete_confirm:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];

  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;

  await ctx.editMessageText(
    `тЪая╕П *Confirm Deletion*\n\n` +
    `Are you sure you want to delete ${count} numbers?\n` +
    `Country: ${countryCode}\n` +
    `Service: ${services[serviceId]?.name || serviceId}\n\n` +
    `This action cannot be undone!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "тЬЕ Yes, Delete", callback_data: `admin_delete_execute:${countryCode}:${serviceId}` },
            { text: "тЭМ Cancel", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

bot.action(/^admin_delete_execute:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];

  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;

  delete numbersByCountryService[countryCode][serviceId];

  if (Object.keys(numbersByCountryService[countryCode]).length === 0) {
    delete numbersByCountryService[countryCode];
  }

  saveNumbers();

  await ctx.editMessageText(
    `тЬЕ *Deleted Successfully*\n\n` +
    `ЁЯЧСя╕П Deleted ${count} numbers\n` +
    `ЁЯУМ Country: ${countryCode}\n` +
    `ЁЯФз Service: ${services[serviceId]?.name || serviceId}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "ЁЯФЩ Back to Admin", callback_data: "admin_back" }]
        ]
      }
    }
  );
});

/******************** ADMIN SETTINGS ********************/
bot.action("admin_settings", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  await ctx.editMessageText(
    "тЪЩя╕П *Bot Settings*\n\n" +
    `тАв Number Count: *${settings.defaultNumberCount}*\n` +
    `тАв Cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `тАв Verification Required: *${settings.requireVerification ? "Yes" : "No"}*\n\n` +
    "Select what to change:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "ЁЯУЮ Number Count", callback_data: "admin_set_count" },
            { text: "тП▒ Cooldown", callback_data: "admin_set_cooldown" }
          ],
          [
            { text: "ЁЯФУ Toggle Verification", callback_data: "admin_toggle_verification" }
          ],
          [
            { text: "ЁЯФЩ Back", callback_data: "admin_back" }
          ]
        ]
      }
    }
  );
});

bot.action("admin_set_count", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  ctx.session.adminState = "waiting_set_count";

  await ctx.editMessageText(
    `ЁЯУЮ *Set Number Count*\n\n` +
    `Current count: *${settings.defaultNumberCount}*\n\n` +
    `Send the new number count (1-100):`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

bot.action("admin_set_cooldown", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  ctx.session.adminState = "waiting_set_cooldown";

  await ctx.editMessageText(
    `тП▒ *Set Cooldown*\n\n` +
    `Current cooldown: *${settings.cooldownSeconds} seconds*\n\n` +
    `Send the new cooldown in seconds (1-3600):`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "тЭМ Cancel", callback_data: "admin_cancel" }]
        ]
      }
    }
  );
});

bot.action("admin_toggle_verification", async (ctx) => {
  if (!ctx.session.isAdmin) return await ctx.answerCbQuery("тЭМ Admin only");

  settings.requireVerification = !settings.requireVerification;
  saveSettings();

  await ctx.answerCbQuery(`тЬЕ Verification ${settings.requireVerification ? "enabled" : "disabled"}`);

  await ctx.editMessageText(
    "тЪЩя╕П *Bot Settings*\n\n" +
    `тАв Number Count: *${settings.defaultNumberCount}*\n` +
    `тАв Cooldown: *${settings.cooldownSeconds} seconds*\n` +
    `тАв Verification Required: *${settings.requireVerification ? "Yes" : "No"}*\n\n` +
    "Select what to change:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "ЁЯУЮ Number Count", callback_data: "admin_set_count" },
            { text: "тП▒ Cooldown", callback_data: "admin_set_cooldown" }
          ],
          [
            { text: "ЁЯФУ Toggle Verification", callback_data: "admin_toggle_verification" }
          ],
          [
            { text: "ЁЯФЩ Back", callback_data: "admin_back" }
          ]
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
      { text: "ЁЯУК Stock Report", callback_data: "admin_stock" },
      { text: "ЁЯСе User Stats", callback_data: "admin_users" }
    ],
    [
      { text: "ЁЯУв Broadcast", callback_data: "admin_broadcast" },
      { text: "ЁЯУЛ OTP Log", callback_data: "admin_otp_log" }
    ],
    [
      { text: "тЮХ Add Numbers", callback_data: "admin_add_numbers" },
      { text: "ЁЯУд Upload File", callback_data: "admin_upload" }
    ],
    [
      { text: "ЁЯЧСя╕П Delete Numbers", callback_data: "admin_delete" },
      { text: "ЁЯФз Manage Services", callback_data: "admin_manage_services" }
    ],
    [
      { text: "ЁЯМН Manage Countries", callback_data: "admin_manage_countries" },
      { text: "тЪЩя╕П Settings", callback_data: "admin_settings" }
    ]
  ];

  buttons.push([
    { text: "ЁЯЪк Logout", callback_data: "admin_logout" }
  ]);

  await ctx.editMessageText(
    "ЁЯЫа *Admin Dashboard*\n\n" +
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
    "тЭМ *Action Cancelled*\n\n" +
    "Returning to admin panel...",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "ЁЯЫа Back to Admin", callback_data: "admin_back" }]
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
    "ЁЯЪк *Admin Logged Out*\n\n" +
    "You have been logged out from admin panel.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "ЁЯФЩ Back to Main Menu", callback_data: "back_to_services" }]
        ]
      }
    }
  );
});

/******************** TEXT HANDLER FOR ADMIN ********************/
bot.on("text", async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text || !ctx.session.isAdmin || !ctx.session.adminState) return;

    const adminState = ctx.session.adminState;
    const text = ctx.message.text;

    if (adminState === "waiting_set_count") {
      const count = parseInt(text);
      if (isNaN(count) || count < 1 || count > 100) {
        return await ctx.reply("тЭМ Please send a valid number between 1 and 100.");
      }

      settings.defaultNumberCount = count;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(`тЬЕ Number count set to *${count}*!`, { parse_mode: "Markdown" });

    } else if (adminState === "waiting_set_cooldown") {
      const seconds = parseInt(text);
      if (isNaN(seconds) || seconds < 1 || seconds > 3600) {
        return await ctx.reply("тЭМ Please send a valid number between 1 and 3600.");
      }

      settings.cooldownSeconds = seconds;
      saveSettings();
      ctx.session.adminState = null;
      await ctx.reply(`тЬЕ Cooldown set to *${seconds} seconds*!`, { parse_mode: "Markdown" });

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
        `ЁЯУв *Broadcast Complete!*\n\n` +
        `тЬЕ Sent: ${sent} users\n` +
        `тЭМ Failed: ${failed} users`,
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
        `тЬЕ *Numbers Added!*\n\n` +
        `тЬЕ Added: ${added}\n` +
        `тЭМ Failed: ${failed}`,
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

        ctx.session.adminState = null;
        await ctx.reply(
          `тЬЕ *Country Added Successfully!*\n\n` +
          `ЁЯУМ *Code:* +${countryCode}\n` +
          `ЁЯП│я╕П *Name:* ${countryName}\n` +
          `${flag} *Flag:* ${flag}`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply("тЭМ Invalid format. Use: `[code] [name] [flag]`", { parse_mode: "Markdown" });
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

        ctx.session.adminState = null;
        await ctx.reply(
          `тЬЕ *Service Added Successfully!*\n\n` +
          `ЁЯУМ *ID:* \`${serviceId}\`\n` +
          `ЁЯФз *Name:* ${serviceName}\n` +
          `${icon} *Icon:* ${icon}`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply("тЭМ Invalid format. Use: `[id] [name] [icon]`", { parse_mode: "Markdown" });
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
      await ctx.reply("тЭМ Please send only .txt files.");
      return;
    }

    await ctx.reply("ЁЯУе Downloading and processing file...");

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
        await ctx.reply("тЭМ Service not selected. Please try again.");
        return;
      }

      const service = services[serviceId];
      if (!service) {
        await ctx.reply("тЭМ Service not found.");
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
            flag: "ЁЯП│я╕П"
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
        `тЬЕ *File Upload Complete!*\n\n` +
        `ЁЯУБ File: ${document.file_name}\n` +
        `ЁЯФз Service: ${service.name}\n\n` +
        `ЁЯУК Results:\n` +
        `тЬЕ Added: *${added}* numbers\n` +
        `тЖкя╕П Skipped (duplicates): *${skipped}*\n` +
        `тЭМ Invalid: *${invalid}*\n\n` +
        `ЁЯУИ Total numbers now: ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length}`,
        { parse_mode: "Markdown" }
      );

    } catch (error) {
      console.error("File processing error:", error);
      await ctx.reply("тЭМ Error processing file. Please try again with a valid .txt file.");
    }

  } catch (error) {
    console.error("File upload error:", error);
    await ctx.reply("тЭМ Error uploading file. Please try again.");
  }
});

/******************** OTP GROUP MONITORING ********************/
bot.on("message", async (ctx) => {
  try {
    if (ctx.chat.id !== OTP_GROUP_ID) return;

    const messageText = ctx.message.text || ctx.message.caption || '';
    const messageId = ctx.message.message_id;

    if (!messageText) return;

    console.log(`ЁЯУи OTP Group Message [${messageId}]: ${messageText.substring(0, 100)}...`);

    let extractedNumber = extractPhoneNumberFromMessage(messageText);

    if (!extractedNumber) {
      const allActiveNumbers = Object.keys(activeNumbers);
      for (const activeNumber of allActiveNumbers) {
        const last4 = activeNumber.slice(-4);
        if (messageText.includes(last4)) {
          console.log(`тЬЕ Found number by last 4 digits: ${activeNumber}`);
          extractedNumber = activeNumber;
          break;
        }
      }
    }

    if (!extractedNumber) {
      console.log("тЭМ No phone number found in message");
      return;
    }

    console.log(`ЁЯУЮ Phone number found: ${extractedNumber}`);

    if (!activeNumbers[extractedNumber]) {
      console.log(`тЭМ No active user for number: ${extractedNumber}`);
      return;
    }

    const userData = activeNumbers[extractedNumber];
    const userId = userData.userId;

    const result = await ctx.telegram.forwardMessage(userId, OTP_GROUP_ID, messageId);

    if (result) {
      console.log(`тЬЕ OTP forwarded to user ${userId}`);

      otpLog.push({
        phoneNumber: extractedNumber,
        userId,
        messageId,
        delivered: true,
        timestamp: new Date().toISOString()
      });
      saveOTPLog();
    } else {
      console.log(`тЭМ Failed to forward OTP to user ${userId}`);
    }

  } catch (error) {
    console.error("OTP monitoring error:", error);
  }
});

/******************** ERROR HANDLER ********************/
bot.catch((err, ctx) => {
  console.error(`тЭМ Bot error for ${ctx.updateType}:`, err);
});

/******************** START BOT ********************/
async function startBot() {
  try {
    console.log("=====================================");
    console.log("ЁЯЪА Starting Number Bot...");
    console.log("ЁЯдЦ Bot Token: [HIDDEN]");
    console.log("ЁЯФС Admin Password: [HIDDEN]");
    console.log("ЁЯУв Main Channel ID: " + MAIN_CHANNEL_ID);
    console.log("ЁЯТм Chat Group ID: " + CHAT_GROUP_ID);
    console.log("ЁЯУи OTP Group ID: " + OTP_GROUP_ID);
    console.log("тЪЩя╕П Default Number Count: " + settings.defaultNumberCount);
    console.log("=====================================");

    await bot.launch();

    console.log("тЬЕ Bot started successfully!");
    console.log("ЁЯУЭ User Command: /start");
    console.log("ЁЯЫа Admin Login: /adminlogin [PASSWORD]");
    console.log("=====================================");

  } catch (error) {
    console.error("тЭМ Failed to start bot:", error);
    console.log("ЁЯФД Restarting in 10 seconds...");
    setTimeout(startBot, 10000);
  }
}

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));