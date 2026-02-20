/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAGUHySCRvg2oH_e2RX93DU5P0R_ZBsWWjE";
const ADMIN_PASSWORD = "63927702";

const MAIN_CHANNEL = "@blackotpnum";
const MAIN_CHANNEL_ID = "https://t.me/blackotpnum"; // For invite check
const CHAT_GROUP = "https://t.me/EarningHub6112";
const CHAT_GROUP_ID = -1003505316319; // Replace with actual chat group ID
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

/******************** SAFE MESSAGE FUNCTIONS ********************/
async function safeSendMessage(chatId, text, options = {}) {
  try {
    return await bot.telegram.sendMessage(chatId, text, options);
  } catch (error) {
    if (error.description && error.description.includes('blocked by the user')) {
      console.log(`⚠️ User ${chatId} blocked the bot. Removing from users list.`);
      
      // Remove blocked user from users list
      if (users[chatId]) {
        delete users[chatId];
        saveUsers();
      }
      
      return null;
    } else {
      console.error(`❌ Error sending message to ${chatId}:`, error.message);
      return null;
    }
  }
}

async function safeEditMessage(chatId, messageId, text, options = {}) {
  try {
    return await bot.telegram.editMessageText(chatId, messageId, null, text, options);
  } catch (error) {
    if (error.description && error.description.includes('message to edit not found')) {
      console.log(`⚠️ Message ${messageId} not found, might be deleted`);
    } else if (error.description && error.description.includes('blocked by the user')) {
      console.log(`⚠️ User ${chatId} blocked the bot.`);
      
      // Remove blocked user from users list
      if (users[chatId]) {
        delete users[chatId];
        saveUsers();
      }
    } else {
      console.error(`❌ Error editing message:`, error.message);
    }
    return null;
  }
}

async function safeForwardMessage(fromChatId, toUserId, messageId) {
  try {
    return await bot.telegram.forwardMessage(toUserId, fromChatId, messageId);
  } catch (error) {
    if (error.description && error.description.includes('blocked by the user')) {
      console.log(`⚠️ User ${toUserId} blocked the bot. Cannot forward OTP.`);
      
      // Remove blocked user from users list
      if (users[toUserId]) {
        delete users[toUserId];
        saveUsers();
      }
    } else {
      console.error(`❌ Error forwarding message:`, error.message);
    }
    return null;
  }
}

async function safeReply(ctx, text, options = {}) {
  try {
    return await ctx.reply(text, options);
  } catch (error) {
    if (error.description && error.description.includes('blocked by the user')) {
      console.log(`⚠️ User ${ctx.from?.id} blocked the bot.`);
      
      // Remove blocked user from users list
      if (ctx.from?.id && users[ctx.from.id]) {
        delete users[ctx.from.id];
        saveUsers();
      }
    } else {
      console.error(`❌ Error replying:`, error.message);
    }
    return null;
  }
}

async function safeEditMessageReply(ctx, text, options = {}) {
  try {
    return await ctx.editMessageText(text, options);
  } catch (error) {
    if (error.description && error.description.includes('message to edit not found')) {
      console.log(`⚠️ Message to edit not found`);
    } else if (error.description && error.description.includes('blocked by the user')) {
      console.log(`⚠️ User blocked the bot.`);
    } else {
      console.error(`❌ Error editing message:`, error.message);
    }
    return null;
  }
}

async function safeAnswerCbQuery(ctx, text, options = {}) {
  try {
    return await ctx.answerCbQuery(text, options);
  } catch (error) {
    console.error(`❌ Error answering callback:`, error.message);
    return null;
  }
}

/******************** HELPER FUNCTIONS ********************/
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

function getSingleNumberByCountryAndService(countryCode, service, userId) {
  if (!numbersByCountryService[countryCode] || !numbersByCountryService[countryCode][service]) {
    return null;
  }
  
  if (numbersByCountryService[countryCode][service].length === 0) {
    return null;
  }
  
  const number = numbersByCountryService[countryCode][service].shift();
  
  activeNumbers[number] = {
    userId: userId,
    countryCode: countryCode,
    service: service,
    assignedAt: new Date().toISOString(),
    lastOTP: null,
    otpCount: 0
  };
  
  saveNumbers();
  saveActiveNumbers();
  
  return number;
}

function extractOTPFromMessage(text) {
  if (!text) return null;
  
  const patterns = [
    /🔑[^\d]*»[^\d]*(\d{4,8})/,
    /OTP[^\d]*»[^\d]*(\d{4,8})/,
    /Your WhatsApp code:\s*(\d{3}[\-\s]?\d{3})/,
    /(\d{3})[\-\s](\d{3})/,
    /(\d{6})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const otp = match[1] || match[0];
      const cleanOTP = otp.replace(/\D/g, '').slice(0, 6);
      if (cleanOTP.length >= 4) {
        return cleanOTP;
      }
    }
  }
  
  return null;
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

async function forwardOTPMessageToUser(phoneNumber, originalMessageId) {
  if (!activeNumbers[phoneNumber]) {
    console.log(`❌ No active user for number: ${phoneNumber}`);
    return false;
  }
  
  const userData = activeNumbers[phoneNumber];
  const userId = userData.userId;
  
  // Forward the EXACT message from OTP group
  const result = await safeForwardMessage(OTP_GROUP_ID, userId, originalMessageId);
  
  if (result) {
    console.log(`✅ OTP forwarded to user ${userId}`);
    
    // Log the OTP
    otpLog.push({
      phoneNumber,
      userId,
      messageId: originalMessageId,
      delivered: true,
      timestamp: new Date().toISOString()
    });
    saveOTPLog();
    
    return true;
  } else {
    console.log(`❌ Failed to forward OTP to user ${userId}`);
    return false;
  }
}

/******************** VERIFICATION FUNCTION ********************/
async function checkUserMembership(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check if user is member of main channel
    let isMainChannelMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(MAIN_CHANNEL_ID, userId);
      isMainChannelMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
      console.log("Error checking main channel:", error.message);
    }
    
    // Check if user is member of chat group
    let isChatGroupMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(CHAT_GROUP_ID, userId);
      isChatGroupMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
      console.log("Error checking chat group:", error.message);
    }
    
    // Check if user is member of OTP group
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

/******************** UPDATE NUMBER MESSAGE FUNCTION ********************/
async function updateNumberMessage(ctx, number, countryCode, service) {
  const country = countries[countryCode];
  const service_ = services[service];
  
  const fullNumber = `+${number}`;
  
  const message = 
    `✅ *Number Received!*\n\n` +
    `📱 *Service:* ${service_.name}\n` +
    `${country.flag} *Country:* ${country.name}\n` +
    `📞 *Number:* \`${fullNumber}\`\n\n` +
    `👇 *কপি করতে নাম্বারে ক্লিক করুন*`;
  
  await safeEditMessageReply(ctx, message, {
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
            text: "🔄 Change Number", 
            callback_data: `user_change_number:${service}:${countryCode}` 
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

/******************** SESSION MIDDLEWARE ********************/
bot.use(session({
  defaultSession: () => ({
    verified: false,
    isAdmin: false,
    adminState: null,
    adminData: null,
    currentNumber: null,
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
    const userId = ctx.from.id;
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
    currentNumber: null,
    currentService: null,
    currentCountry: null,
    lastNumberTime: 0,
    lastMessageId: null,
    lastChatId: null,
    lastVerificationCheck: 0
  };
  
  return next();
});

/******************** START COMMAND ********************/
bot.start(async (ctx) => {
  try {
    ctx.session.verified = false;
    ctx.session.isAdmin = false;
    ctx.session.adminState = null;
    ctx.session.adminData = null;
    ctx.session.currentNumber = null;
    ctx.session.currentService = null;
    ctx.session.currentCountry = null;
    ctx.session.lastNumberTime = 0;
    ctx.session.lastMessageId = null;
    ctx.session.lastChatId = null;
    ctx.session.lastVerificationCheck = 0;
    
    await safeReply(ctx,
      "🤖 *Welcome to AH Method Number Bot*\n\n" +
      "🔐 *Verification Required*\n" +
      "To use this bot, you must join all required groups first:\n\n" +
      "📢 *Main Channel:* @yousufinternationaltricks\n" +
      "💬 *Chat Group:* [Join Chat Group](" + CHAT_GROUP + ")\n" +
      "📨 *OTP Group:* [Join OTP Group](" + OTP_GROUP + ")\n\n" +
      "After joining all groups, click the verify button below:",
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📢 Main Channel", url: "https://t.me/yousufinternationaltricks" }
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

/******************** VERIFICATION ********************/
bot.action("verify_user", async (ctx) => {
  try {
    await safeAnswerCbQuery(ctx, "⏳ Checking membership...");
    
    // Check if user has joined all required groups
    const membership = await checkUserMembership(ctx);
    
    if (membership.allJoined) {
      // User has joined all groups
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = Date.now();
      
      // Update user's verified status
      if (users[ctx.from.id]) {
        users[ctx.from.id].verified = true;
        saveUsers();
      }
      
      await safeEditMessageReply(ctx,
        "✅ *Verification Successful!*\n\n" +
        "You have joined all required groups and can now use all bot features.",
        {
          parse_mode: "Markdown"
        }
      );
      
      // Send reply keyboard as a NEW message
      await safeReply(ctx,
        "Choose an option:",
        Markup.keyboard([
          ["📞 Get Number", "🔄 Change Number"],
          ["🏠 Main Menu"]
        ]).resize()
      );
      
    } else {
      // User hasn't joined all groups
      let notJoinedMsg = "❌ *Verification Failed*\n\nYou haven't joined the following groups:\n";
      
      if (!membership.mainChannel) notJoinedMsg += "• 📢 Main Channel\n";
      if (!membership.chatGroup) notJoinedMsg += "• 💬 Chat Group\n";
      if (!membership.otpGroup) notJoinedMsg += "• 📨 OTP Group\n";
      
      notJoinedMsg += "\nPlease join all required groups and try again.";
      
      await safeEditMessageReply(ctx, notJoinedMsg, {
        parse_mode: "Markdown"
      });
    }
    
  } catch (error) {
    console.error("Verification error:", error);
    await safeAnswerCbQuery(ctx, "❌ Verification failed", { show_alert: true });
  }
});

/******************** VERIFICATION CHECK MIDDLEWARE ********************/
bot.use(async (ctx, next) => {
  // Skip verification check for certain commands/actions
  if (ctx.message?.text?.startsWith('/start') || 
      ctx.message?.text?.startsWith('/adminlogin') ||
      ctx.callbackQuery?.data === 'verify_user' ||
      ctx.session?.isAdmin) {
    return next();
  }
  
  // Check if user is verified
  if (ctx.from && !ctx.session?.verified) {
    // Periodic re-verification (every 24 hours)
    const now = Date.now();
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
      // User not verified, redirect to start
      await safeReply(ctx,
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

/******************** MAIN MENU HANDLER ********************/
bot.hears("🏠 Main Menu", async (ctx) => {
  try {
    await safeReply(ctx,
      "🏠 *Main Menu*\n\n" +
      "Select an option:",
      {
        parse_mode: "Markdown",
        reply_markup: Markup.keyboard([
          ["📞 Get Number", "🔄 Change Number"],
          ["🏠 Main Menu"]
        ]).resize()
      }
    );
  } catch (error) {
    console.error("Main menu error:", error);
  }
});

/******************** COPY CONFIRMATION HANDLER ********************/
bot.action(/^copy_number:(.+)$/, async (ctx) => {
  try {
    const number = ctx.match[1];
    
    await safeAnswerCbQuery(ctx,
      `✅ নাম্বার কপি হয়েছে: ${number}`, 
      { show_alert: false }
    );
    
  } catch (error) {
    console.error("Copy number error:", error);
  }
});

/******************** BACK TO SERVICES HANDLER ********************/
bot.action("back_to_services", async (ctx) => {
  try {
    if (!ctx.session.verified) {
      return await safeAnswerCbQuery(ctx, "❌ Please verify first", { show_alert: true });
    }
    
    // Show service selection again
    const serviceButtons = [];
    for (const serviceId in services) {
      const service = services[serviceId];
      const availableCountries = getAvailableCountriesForService(serviceId);
      
      if (availableCountries.length > 0) {
        serviceButtons.push([
          { 
            text: `${service.icon} ${service.name}`, 
            callback_data: `user_select_service:${serviceId}` 
          }
        ]);
      }
    }
    
    if (serviceButtons.length === 0) {
      return await safeEditMessageReply(ctx,
        "📭 *No Numbers Available*\n\n" +
        "Sorry, all numbers are currently in use.\n" +
        "Please try again later or contact admin.",
        { parse_mode: "Markdown" }
      );
    }
    
    await safeEditMessageReply(ctx,
      "🎯 *Select Service*\n\n" +
      "Choose the service you need a number for:",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: serviceButtons
        }
      }
    );
    
  } catch (error) {
    console.error("Back to services error:", error);
    await safeAnswerCbQuery(ctx, "❌ Error", { show_alert: true });
  }
});

/******************** USER GET NUMBER COMMAND ********************/
bot.hears("📞 Get Number", async (ctx) => {
  try {
    if (!ctx.session.verified) {
      return await safeReply(ctx, "❌ Please verify first. Use /start");
    }
    
    // Check cooldown
    if (ctx.session.currentNumber && ctx.session.lastNumberTime) {
      const now = Date.now();
      const timeSinceLast = now - ctx.session.lastNumberTime;
      const cooldown = 5000;
      
      if (timeSinceLast < cooldown) {
        const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
        return await safeReply(ctx,
          `⏳ Please wait ${remaining} seconds before getting a new number.`,
          Markup.keyboard([
            ["📞 Get Number", "🔄 Change Number"],
            ["🏠 Main Menu"]
          ]).resize()
        );
      }
    }
    
    // Show service selection
    const serviceButtons = [];
    for (const serviceId in services) {
      const service = services[serviceId];
      const availableCountries = getAvailableCountriesForService(serviceId);
      
      if (availableCountries.length > 0) {
        serviceButtons.push([
          { 
            text: `${service.icon} ${service.name}`, 
            callback_data: `user_select_service:${serviceId}` 
          }
        ]);
      }
    }
    
    if (serviceButtons.length === 0) {
      return await safeReply(ctx,
        "📭 *No Numbers Available*\n\n" +
        "Sorry, all numbers are currently in use.\n" +
        "Please try again later or contact admin.",
        {
          parse_mode: "Markdown",
          reply_markup: Markup.keyboard([
            ["📞 Get Number", "🔄 Change Number"],
            ["🏠 Main Menu"]
          ]).resize()
        }
      );
    }
    
    await safeReply(ctx,
      "🎯 *Select Service*\n\n" +
      "Choose the service you need a number for:",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: serviceButtons
        }
      }
    );
    
  } catch (error) {
    console.error("Get number error:", error);
    await safeReply(ctx,
      "❌ Error getting number. Please try again.",
      Markup.keyboard([
        ["📞 Get Number", "🔄 Change Number"],
        ["🏠 Main Menu"]
      ]).resize()
    );
  }
});

/******************** USER SELECT SERVICE ********************/
bot.action(/^user_select_service:(.+)$/, async (ctx) => {
  try {
    const serviceId = ctx.match[1];
    const availableCountries = getAvailableCountriesForService(serviceId);
    
    if (availableCountries.length === 0) {
      return await safeAnswerCbQuery(ctx, "❌ No numbers for this service", { show_alert: true });
    }
    
    const countryButtons = availableCountries.map(countryCode => {
      const country = countries[countryCode];
      const count = numbersByCountryService[countryCode][serviceId].length;
      
      return [
        { 
          text: `${country.flag} ${country.name} (${count})`, 
          callback_data: `user_select_country:${serviceId}:${countryCode}` 
        }
      ];
    });
    
    const service = services[serviceId];
    
    // ব্যাক বাটন যোগ করা
    countryButtons.push([
      { text: "🔙 Back to Services", callback_data: "back_to_services" }
    ]);
    
    await safeEditMessageReply(ctx,
      `🌍 *Select Country for ${service.icon} ${service.name}*\n\n` +
      "Choose a country to get a number from:",
      {
        parse_mode: "Markdown",
        reply_markup: { 
          inline_keyboard: countryButtons
        }
      }
    );
    
  } catch (error) {
    console.error("Service selection error:", error);
    await safeAnswerCbQuery(ctx, "❌ Error selecting service", { show_alert: true });
  }
});

/******************** USER SELECT COUNTRY ********************/
bot.action(/^user_select_country:(.+):(.+)$/, async (ctx) => {
  try {
    const serviceId = ctx.match[1];
    const countryCode = ctx.match[2];
    const userId = ctx.from.id;
    
    // Check cooldown
    const now = Date.now();
    const timeSinceLast = now - ctx.session.lastNumberTime;
    const cooldown = 5000;
    
    if (timeSinceLast < cooldown) {
      const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
      return await safeAnswerCbQuery(ctx, `⏳ Wait ${remaining}s`, { show_alert: true });
    }
    
    // Get number
    const number = getSingleNumberByCountryAndService(countryCode, serviceId, userId);
    
    if (!number) {
      return await safeAnswerCbQuery(ctx, "❌ No numbers available", { show_alert: true });
    }
    
    // Clear previous number if exists
    if (ctx.session.currentNumber && activeNumbers[ctx.session.currentNumber]) {
      delete activeNumbers[ctx.session.currentNumber];
      saveActiveNumbers();
    }
    
    // Update session
    ctx.session.currentNumber = number;
    ctx.session.currentService = serviceId;
    ctx.session.currentCountry = countryCode;
    ctx.session.lastNumberTime = now;
    
    // মেসেজ তৈরি এবং পাঠানো
    const country = countries[countryCode];
    const service = services[serviceId];
    const fullNumber = `+${number}`;
    
    const message = 
      `✅ *Number Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n` +
      `📞 *Number:* \`${fullNumber}\`\n\n` +
      `👇 *কপি করতে নাম্বারে ক্লিক করুন*`;
    
    const sentMessage = await safeEditMessageReply(ctx, message, {
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
              text: "🔄 Change Number", 
              callback_data: `user_change_number:${serviceId}:${countryCode}` 
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
    
    // মেসেজ আইডি সংরক্ষণ করুন
    if (sentMessage && sentMessage.message_id) {
      ctx.session.lastMessageId = sentMessage.message_id;
      ctx.session.lastChatId = ctx.chat.id;
    }
    
  } catch (error) {
    console.error("Country selection error:", error);
    await safeAnswerCbQuery(ctx, "❌ Error getting number", { show_alert: true });
  }
});

/******************** USER CHANGE NUMBER - REPLY BUTTON ********************/
bot.hears("🔄 Change Number", async (ctx) => {
  try {
    if (!ctx.session.verified) {
      return await safeReply(ctx, "❌ Please verify first. Use /start");
    }
    
    if (!ctx.session.currentNumber) {
      return await safeReply(ctx,
        "❌ You don't have an active number.\nClick '📞 Get Number' first.",
        Markup.keyboard([
          ["📞 Get Number", "🔄 Change Number"],
          ["🏠 Main Menu"]
        ]).resize()
      );
    }
    
    // Check cooldown
    const now = Date.now();
    const timeSinceLast = now - ctx.session.lastNumberTime;
    const cooldown = 5000;
    
    if (timeSinceLast < cooldown) {
      const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
      return await safeReply(ctx,
        `⏳ Please wait ${remaining} seconds before changing number.`,
        Markup.keyboard([
          ["📞 Get Number", "🔄 Change Number"],
          ["🏠 Main Menu"]
        ]).resize()
      );
    }
    
    // Get current service and country
    const serviceId = ctx.session.currentService;
    const countryCode = ctx.session.currentCountry;
    
    if (!serviceId || !countryCode) {
      return await safeReply(ctx,
        "❌ Cannot change number. Please get a new number first.",
        Markup.keyboard([
          ["📞 Get Number", "🔄 Change Number"],
          ["🏠 Main Menu"]
        ]).resize()
      );
    }
    
    // Get new number
    const userId = ctx.from.id;
    const number = getSingleNumberByCountryAndService(countryCode, serviceId, userId);
    
    if (!number) {
      return await safeReply(ctx,
        "❌ No more numbers available for this service/country.\nPlease try a different service or country.",
        Markup.keyboard([
          ["📞 Get Number", "🔄 Change Number"],
          ["🏠 Main Menu"]
        ]).resize()
      );
    }
    
    // Update active numbers
    if (ctx.session.currentNumber && activeNumbers[ctx.session.currentNumber]) {
      delete activeNumbers[ctx.session.currentNumber];
      saveActiveNumbers();
    }
    
    // Update session
    ctx.session.currentNumber = number;
    ctx.session.lastNumberTime = now;
    
    // যদি আগের মেসেজ থাকে, সেটা আপডেট করুন
    if (ctx.session.lastMessageId && ctx.session.lastChatId) {
      try {
        const country = countries[countryCode];
        const service = services[serviceId];
        const fullNumber = `+${number}`;
        
        const message = 
          `✅ *Number Received!*\n\n` +
          `📱 *Service:* ${service.name}\n` +
          `${country.flag} *Country:* ${country.name}\n` +
          `📞 *Number:* \`${fullNumber}\`\n\n` +
          `👇 *কপি করতে নাম্বারে ক্লিক করুন*`;
        
        await safeEditMessage(
          ctx.session.lastChatId,
          ctx.session.lastMessageId,
          message,
          {
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
                    text: "🔄 Change Number", 
                    callback_data: `user_change_number:${serviceId}:${countryCode}` 
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
          }
        );
        
        // সফল হলে এখানেই শেষ
        return;
      } catch (error) {
        console.error("Error updating message:", error);
        // যদি আপডেট করতে সমস্যা হয়, নতুন মেসেজ পাঠান
      }
    }
    
    // নতুন মেসেজ পাঠান
    const country = countries[countryCode];
    const service = services[serviceId];
    const fullNumber = `+${number}`;
    
    const message = 
      `✅ *Number Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n` +
      `📞 *Number:* \`${fullNumber}\`\n\n` +
      `👇 *কপি করতে নাম্বারে ক্লিক করুন*`;
    
    const sentMessage = await safeReply(ctx, message, {
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
              text: "🔄 Change Number", 
              callback_data: `user_change_number:${serviceId}:${countryCode}` 
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
    
    // নতুন মেসেজ আইডি সংরক্ষণ করুন
    if (sentMessage && sentMessage.message_id) {
      ctx.session.lastMessageId = sentMessage.message_id;
      ctx.session.lastChatId = ctx.chat.id;
    }
    
  } catch (error) {
    console.error("Change number error:", error);
    await safeReply(ctx,
      "❌ Error changing number. Please try again.",
      Markup.keyboard([
        ["📞 Get Number", "🔄 Change Number"],
        ["🏠 Main Menu"]
      ]).resize()
    );
  }
});

/******************** USER CHANGE NUMBER - INLINE BUTTON ********************/
bot.action(/^user_change_number:(.+):(.+)$/, async (ctx) => {
  try {
    const serviceId = ctx.match[1];
    const countryCode = ctx.match[2];
    const userId = ctx.from.id;
    
    // Check cooldown
    const now = Date.now();
    const timeSinceLast = now - ctx.session.lastNumberTime;
    const cooldown = 5000;
    
    if (timeSinceLast < cooldown) {
      const remaining = Math.ceil((cooldown - timeSinceLast) / 1000);
      return await safeAnswerCbQuery(ctx, `⏳ Wait ${remaining}s`, { show_alert: true });
    }
    
    // Get new number
    const number = getSingleNumberByCountryAndService(countryCode, serviceId, userId);
    
    if (!number) {
      return await safeAnswerCbQuery(ctx, "❌ No more numbers", { show_alert: true });
    }
    
    // Update active numbers
    if (ctx.session.currentNumber && activeNumbers[ctx.session.currentNumber]) {
      delete activeNumbers[ctx.session.currentNumber];
      saveActiveNumbers();
    }
    
    // Update session
    ctx.session.currentNumber = number;
    ctx.session.currentService = serviceId;
    ctx.session.currentCountry = countryCode;
    ctx.session.lastNumberTime = now;
    
    // একই মেসেজ আপডেট করুন
    const country = countries[countryCode];
    const service = services[serviceId];
    const fullNumber = `+${number}`;
    
    const message = 
      `✅ *Number Received!*\n\n` +
      `📱 *Service:* ${service.name}\n` +
      `${country.flag} *Country:* ${country.name}\n` +
      `📞 *Number:* \`${fullNumber}\`\n\n` +
      `👇 *কপি করতে নাম্বারে ক্লিক করুন*`;
    
    await safeEditMessageReply(ctx, message, {
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
              text: "🔄 Change Number", 
              callback_data: `user_change_number:${serviceId}:${countryCode}` 
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
    
    // মেসেজ আইডি সংরক্ষণ করুন
    ctx.session.lastMessageId = ctx.update.callback_query.message.message_id;
    ctx.session.lastChatId = ctx.chat.id;
    
  } catch (error) {
    console.error("Change number error:", error);
    await safeAnswerCbQuery(ctx, "❌ Error changing number", { show_alert: true });
  }
});

/******************** ADMIN COMMANDS ********************/
bot.command("adminlogin", async (ctx) => {
  try {
    console.log("🔑 Admin login command received");
    
    const parts = ctx.message.text.split(' ');
    
    if (parts.length < 2) {
      return await safeReply(ctx, "❌ Usage: /adminlogin [password]\nExample: /adminlogin 63927702");
    }
    
    const password = parts[1];
    
    if (password === ADMIN_PASSWORD) {
      ctx.session.isAdmin = true;
      ctx.session.verified = true;
      
      await safeReply(ctx,
        "✅ *Admin Login Successful!*\n\n" +
        "You now have administrator privileges.\n" +
        "Use /admin to access admin panel.",
        { 
          parse_mode: "Markdown",
          reply_markup: Markup.keyboard([
            ["📞 Get Number", "🔄 Change Number"],
            ["🏠 Main Menu"]
          ]).resize()
        }
      );
    } else {
      await safeReply(ctx, "❌ Wrong password. Access denied.");
    }
  } catch (error) {
    console.error("Admin login error:", error);
    await safeReply(ctx, "❌ Error during admin login.");
  }
});

bot.command("admin", async (ctx) => {
  try {
    if (!ctx.session.isAdmin) {
      return await safeReply(ctx,
        "❌ *Admin Access Required*\n\n" +
        "Use /adminlogin 63927702 to login as admin.",
        { parse_mode: "Markdown" }
      );
    }
    
    await safeReply(ctx,
      "🛠 *Admin Dashboard*\n\n" +
      "Select an option:",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📤 Upload Numbers", callback_data: "admin_upload" },
              { text: "📊 Stock Report", callback_data: "admin_stock" }
            ],
            [
              { text: "🌍 Add Country", callback_data: "admin_add_country" },
              { text: "🔧 Add Service", callback_data: "admin_add_service" }
            ],
            [
              { text: "🗑️ Delete Service", callback_data: "admin_delete_service" },
              { text: "👥 User Stats", callback_data: "admin_users" }
            ],
            [
              { text: "📢 Broadcast", callback_data: "admin_broadcast" },
              { text: "➕ Add Numbers", callback_data: "admin_add_numbers" }
            ],
            [
              { text: "❌ Delete Numbers", callback_data: "admin_delete" },
              { text: "📋 List Services", callback_data: "admin_list_services" }
            ],
            [
              { text: "🚪 Logout", callback_data: "admin_logout" }
            ]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error("Admin command error:", error);
    await safeReply(ctx, "❌ Error accessing admin panel.");
  }
});

/******************** ADMIN ACTIONS ********************/
bot.action("admin_upload", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
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
  
  await safeEditMessageReply(ctx,
    "📤 *Upload Numbers*\n\n" +
    "Select service for the numbers:",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: serviceButtons }
    }
  );
});

bot.action(/^admin_select_service:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  const serviceId = ctx.match[1];
  const service = services[serviceId];
  
  ctx.session.adminState = "waiting_upload_file";
  ctx.session.adminData = { serviceId: serviceId };
  
  await safeEditMessageReply(ctx,
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

bot.action("admin_stock", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  let report = "📊 *Stock Report*\n\n";
  let totalNumbers = 0;
  
  if (Object.keys(numbersByCountryService).length === 0) {
    report += "📭 *No numbers available*\n";
  } else {
    for (const countryCode in numbersByCountryService) {
      const country = countries[countryCode];
      const countryName = country ? `${country.flag} ${country.name}` : `Country ${countryCode}`;
      
      report += `\n${countryName} (+${countryCode}):\n`;
      
      let hasNumbers = false;
      let countryTotal = 0;
      
      for (const serviceId in numbersByCountryService[countryCode]) {
        const service = services[serviceId];
        const serviceName = service ? `${service.icon} ${service.name}` : serviceId;
        const count = numbersByCountryService[countryCode][serviceId].length;
        
        if (count > 0) {
          report += `  ${serviceName}: *${count}*\n`;
          countryTotal += count;
          hasNumbers = true;
        }
      }
      
      if (hasNumbers) {
        report += `  *Total:* ${countryTotal}\n`;
        totalNumbers += countryTotal;
      } else {
        report += `  📭 No numbers\n`;
      }
    }
  }
  
  report += `\n📈 *Grand Total:* ${totalNumbers} numbers\n`;
  report += `👥 *Active Users:* ${Object.keys(activeNumbers).length}\n`;
  report += `📨 *OTPs Forwarded:* ${otpLog.filter(log => log.delivered).length}`;
  
  await safeEditMessageReply(ctx, report, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Refresh", callback_data: "admin_stock" }],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

bot.action("admin_add_country", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.adminState = "waiting_add_country";
  
  await safeEditMessageReply(ctx,
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

bot.action("admin_add_service", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.adminState = "waiting_add_service";
  
  await safeEditMessageReply(ctx,
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

bot.action("admin_add_numbers", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.adminState = "waiting_add_numbers";
  
  await safeEditMessageReply(ctx,
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

bot.action("admin_delete", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
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
  
  await safeEditMessageReply(ctx, report, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_delete_confirm:(.+):(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];
  
  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;
  
  await safeEditMessageReply(ctx,
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
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  const countryCode = ctx.match[1];
  const serviceId = ctx.match[2];
  
  const count = numbersByCountryService[countryCode]?.[serviceId]?.length || 0;
  
  delete numbersByCountryService[countryCode][serviceId];
  
  // If no services left for this country, remove country
  if (Object.keys(numbersByCountryService[countryCode]).length === 0) {
    delete numbersByCountryService[countryCode];
  }
  
  saveNumbers();
  
  await safeEditMessageReply(ctx,
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

bot.action("admin_list_services", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  let report = "📋 *Services List*\n\n";
  
  for (const serviceId in services) {
    const service = services[serviceId];
    report += `• ${service.icon} *${service.name}* (ID: \`${serviceId}\`)\n`;
  }
  
  await safeEditMessageReply(ctx, report, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

bot.action("admin_users", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  let message = "👥 *User Statistics*\n\n";
  
  const totalUsers = Object.keys(users).length;
  const activeUsers = Object.keys(activeNumbers).length;
  
  message += `📊 *Statistics:*\n`;
  message += `• Total Registered Users: ${totalUsers}\n`;
  message += `• Active Users (with numbers): ${activeUsers}\n`;
  message += `• Total OTPs Delivered: ${otpLog.filter(log => log.delivered).length}\n\n`;
  
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
  
  await safeEditMessageReply(ctx, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Refresh", callback_data: "admin_users" }],
        [{ text: "🔙 Back", callback_data: "admin_back" }]
      ]
    }
  });
});

bot.action("admin_broadcast", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.adminState = "waiting_broadcast";
  
  await safeEditMessageReply(ctx,
    "📢 *Broadcast Message*\n\n" +
    "Send the message you want to broadcast to all users.\n\n" +
    "*Format:* You can use Markdown formatting.\n" +
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

bot.action("admin_logout", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.isAdmin = false;
  ctx.session.adminState = null;
  ctx.session.adminData = null;
  
  await safeEditMessageReply(ctx,
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

bot.action("admin_back", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.adminState = null;
  ctx.session.adminData = null;
  
  await safeEditMessageReply(ctx,
    "🛠 *Admin Dashboard*\n\n" +
    "Select an option:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📤 Upload Numbers", callback_data: "admin_upload" },
            { text: "📊 Stock Report", callback_data: "admin_stock" }
          ],
          [
            { text: "🌍 Add Country", callback_data: "admin_add_country" },
            { text: "🔧 Add Service", callback_data: "admin_add_service" }
          ],
          [
            { text: "🗑️ Delete Service", callback_data: "admin_delete_service" },
            { text: "👥 User Stats", callback_data: "admin_users" }
          ],
          [
            { text: "📢 Broadcast", callback_data: "admin_broadcast" },
            { text: "➕ Add Numbers", callback_data: "admin_add_numbers" }
          ],
          [
            { text: "❌ Delete Numbers", callback_data: "admin_delete" },
            { text: "📋 List Services", callback_data: "admin_list_services" }
          ],
          [
            { text: "🚪 Logout", callback_data: "admin_logout" }
          ]
        ]
      }
    }
  );
});

bot.action("admin_cancel", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeAnswerCbQuery(ctx, "❌ Admin only");
  
  ctx.session.adminState = null;
  ctx.session.adminData = null;
  
  await safeEditMessageReply(ctx,
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
      await safeReply(ctx, "❌ Please send only .txt files.");
      return;
    }
    
    await safeReply(ctx, "📥 Downloading and processing file...");
    
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
        await safeReply(ctx, "❌ Service not selected. Please try again.");
        return;
      }
      
      const service = services[serviceId];
      if (!service) {
        await safeReply(ctx, "❌ Service not found.");
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
      
      await safeReply(ctx,
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
      await safeReply(ctx, "❌ Error processing file. Please try again with a valid .txt file.");
    }
    
  } catch (error) {
    console.error("File upload error:", error);
    await safeReply(ctx, "❌ Error uploading file. Please try again.");
  }
});

/******************** TEXT MESSAGE HANDLER FOR ADMIN ********************/
bot.on("text", async (ctx) => {
  try {
    // Check if it's a text message
    if (!ctx.message || !ctx.message.text) {
      return;
    }
    
    // Handle admin text commands
    if (ctx.session.isAdmin && ctx.session.adminState) {
      const adminState = ctx.session.adminState;
      const text = ctx.message.text;
      
      switch (adminState) {
        case "waiting_add_country":
          const countryParts = text.trim().split(/\s+/);
          if (countryParts.length >= 3) {
            const countryCode = countryParts[0];
            const countryName = countryParts.slice(1, -1).join(" ");
            const flag = countryParts[countryParts.length - 1];
            
            countries[countryCode] = {
              name: countryName,
              flag: flag
            };
            
            saveCountries();
            
            await safeReply(ctx,
              `✅ *Country Added Successfully!*\n\n` +
              `📌 *Code:* +${countryCode}\n` +
              `🏳️ *Name:* ${countryName}\n` +
              `${flag} *Flag:* ${flag}`,
              { parse_mode: "Markdown" }
            );
            
            ctx.session.adminState = null;
            ctx.session.adminData = null;
          } else {
            await safeReply(ctx, "❌ Invalid format. Use: `[code] [name] [flag]`", { parse_mode: "Markdown" });
          }
          break;
          
        case "waiting_add_service":
          const serviceParts = text.trim().split(/\s+/);
          if (serviceParts.length >= 3) {
            const serviceId = serviceParts[0].toLowerCase();
            const serviceName = serviceParts.slice(1, -1).join(" ");
            const icon = serviceParts[serviceParts.length - 1];
            
            services[serviceId] = {
              name: serviceName,
              icon: icon
            };
            
            saveServices();
            
            await safeReply(ctx,
              `✅ *Service Added Successfully!*\n\n` +
              `📌 *ID:* \`${serviceId}\`\n` +
              `🔧 *Name:* ${serviceName}\n` +
              `${icon} *Icon:* ${icon}`,
              { parse_mode: "Markdown" }
            );
            
            ctx.session.adminState = null;
            ctx.session.adminData = null;
          } else {
            await safeReply(ctx, "❌ Invalid format. Use: `[id] [name] [icon]`", { parse_mode: "Markdown" });
          }
          break;
          
        case "waiting_add_numbers":
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
          
          await safeReply(ctx,
            `✅ *Numbers Added!*\n\n` +
            `✅ Added: *${added}*\n` +
            `❌ Failed: *${failed}*\n\n` +
            `📊 Total numbers now: ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length}`,
            { parse_mode: "Markdown" }
          );
          
          ctx.session.adminState = null;
          ctx.session.adminData = null;
          break;
          
        case "waiting_broadcast":
          let sent = 0;
          let failedBroadcast = 0;
          
          for (const userId in users) {
            const result = await safeSendMessage(userId, text, { parse_mode: "Markdown" });
            if (result) {
              sent++;
            } else {
              failedBroadcast++;
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          ctx.session.adminState = null;
          
          await safeReply(ctx,
            `📢 *Broadcast Complete!*\n\n` +
            `✅ Sent: *${sent}* users\n` +
            `❌ Failed: *${failedBroadcast}* users\n\n` +
            `📝 Total users: ${Object.keys(users).length}`,
            { parse_mode: "Markdown" }
          );
          break;
      }
    }
  } catch (error) {
    console.error("Admin text handler error:", error);
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
      await forwardOTPMessageToUser(extractedNumber, messageId);
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
    console.log("🚀 Starting AH Method Number Bot...");
    console.log("🤖 Bot Token: [HIDDEN]");
    console.log("🔑 Admin Password: [HIDDEN]");
    console.log("📢 Main Channel: @yousufinternationaltricks");
    console.log("💬 Chat Group: https://t.me/+n5LwmSZ7neA2OGE9");
    console.log("📨 OTP Group: https://t.me/+5zshtYBMFoo4OTRl");
    console.log("📨 OTP Group ID: -1002827526018");
    console.log("=====================================");
    
    await bot.launch();
    
    console.log("✅ Bot started successfully!");
    console.log("📝 User Command: /start");
    console.log("🛠 Admin Login: /adminlogin [PASSWORD]");
    console.log("=====================================");
    console.log("✨ Features:");
    console.log("   • Reply Buttons: 📞 Get Number, 🔄 Change Number, 🏠 Main Menu");
    console.log("   • Verification: Checks all group memberships");
    console.log("   • Error Handling: Safe message sending with blocked user detection");
    console.log("   • Auto OTP forwarding");
    console.log("   • 5-second cooldown");
    console.log("   • Working Admin Panel");
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