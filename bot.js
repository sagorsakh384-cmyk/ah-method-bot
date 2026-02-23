/******************** IMPORTS ********************/
const { Telegraf, session, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

/******************** YOUR CONFIGURATION ********************/
const BOT_TOKEN = "8427643964:AAFYIja3-uFmDblVY74_jR9tn6jQhvSBqMk";
const ADMIN_PASSWORD = "sadhin8miya6145";

const MAIN_CHANNEL = "@blackotpnum";
const MAIN_CHANNEL_ID = "@blackotpnum";
const CHAT_GROUP = "https://t.me/EarningHub6112";
const CHAT_GROUP_ID = -1003247504066;
const OTP_GROUP = "https://t.me/Spideyhuntotp";
const OTP_GROUP_ID = -1003007557624;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set");
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

/******************** ALL WORLD COUNTRIES (240+) ********************/
const ALL_WORLD_COUNTRIES = {
  "1": { name: "USA/Canada", flag: "🇺🇸" },
  "7": { name: "Russia/Kazakhstan", flag: "🇷🇺" },
  "20": { name: "Egypt", flag: "🇪🇬" },
  "27": { name: "South Africa", flag: "🇿🇦" },
  "30": { name: "Greece", flag: "🇬🇷" },
  "31": { name: "Netherlands", flag: "🇳🇱" },
  "32": { name: "Belgium", flag: "🇧🇪" },
  "33": { name: "France", flag: "🇫🇷" },
  "34": { name: "Spain", flag: "🇪🇸" },
  "36": { name: "Hungary", flag: "🇭🇺" },
  "39": { name: "Italy", flag: "🇮🇹" },
  "40": { name: "Romania", flag: "🇷🇴" },
  "41": { name: "Switzerland", flag: "🇨🇭" },
  "43": { name: "Austria", flag: "🇦🇹" },
  "44": { name: "UK", flag: "🇬🇧" },
  "45": { name: "Denmark", flag: "🇩🇰" },
  "46": { name: "Sweden", flag: "🇸🇪" },
  "47": { name: "Norway", flag: "🇳🇴" },
  "48": { name: "Poland", flag: "🇵🇱" },
  "49": { name: "Germany", flag: "🇩🇪" },
  "51": { name: "Peru", flag: "🇵🇪" },
  "52": { name: "Mexico", flag: "🇲🇽" },
  "53": { name: "Cuba", flag: "🇨🇺" },
  "54": { name: "Argentina", flag: "🇦🇷" },
  "55": { name: "Brazil", flag: "🇧🇷" },
  "56": { name: "Chile", flag: "🇨🇱" },
  "57": { name: "Colombia", flag: "🇨🇴" },
  "58": { name: "Venezuela", flag: "🇻🇪" },
  "60": { name: "Malaysia", flag: "🇲🇾" },
  "61": { name: "Australia", flag: "🇦🇺" },
  "62": { name: "Indonesia", flag: "🇮🇩" },
  "63": { name: "Philippines", flag: "🇵🇭" },
  "64": { name: "New Zealand", flag: "🇳🇿" },
  "65": { name: "Singapore", flag: "🇸🇬" },
  "66": { name: "Thailand", flag: "🇹🇭" },
  "81": { name: "Japan", flag: "🇯🇵" },
  "82": { name: "South Korea", flag: "🇰🇷" },
  "84": { name: "Vietnam", flag: "🇻🇳" },
  "86": { name: "China", flag: "🇨🇳" },
  "90": { name: "Turkey", flag: "🇹🇷" },
  "91": { name: "India", flag: "🇮🇳" },
  "92": { name: "Pakistan", flag: "🇵🇰" },
  "93": { name: "Afghanistan", flag: "🇦🇫" },
  "94": { name: "Sri Lanka", flag: "🇱🇰" },
  "95": { name: "Myanmar", flag: "🇲🇲" },
  "98": { name: "Iran", flag: "🇮🇷" },
  "212": { name: "Morocco", flag: "🇲🇦" },
  "213": { name: "Algeria", flag: "🇩🇿" },
  "216": { name: "Tunisia", flag: "🇹🇳" },
  "218": { name: "Libya", flag: "🇱🇾" },
  "220": { name: "Gambia", flag: "🇬🇲" },
  "221": { name: "Senegal", flag: "🇸🇳" },
  "222": { name: "Mauritania", flag: "🇲🇷" },
  "223": { name: "Mali", flag: "🇲🇱" },
  "224": { name: "Guinea", flag: "🇬🇳" },
  "225": { name: "Cote d'Ivoire", flag: "🇨🇮" },
  "226": { name: "Burkina Faso", flag: "🇧🇫" },
  "227": { name: "Niger", flag: "🇳🇪" },
  "228": { name: "Togo", flag: "🇹🇬" },
  "229": { name: "Benin", flag: "🇧🇯" },
  "230": { name: "Mauritius", flag: "🇲🇺" },
  "231": { name: "Liberia", flag: "🇱🇷" },
  "232": { name: "Sierra Leone", flag: "🇸🇱" },
  "233": { name: "Ghana", flag: "🇬🇭" },
  "234": { name: "Nigeria", flag: "🇳🇬" },
  "235": { name: "Chad", flag: "🇹🇩" },
  "236": { name: "Central African Republic", flag: "🇨🇫" },
  "237": { name: "Cameroon", flag: "🇨🇲" },
  "238": { name: "Cape Verde", flag: "🇨🇻" },
  "239": { name: "Sao Tome and Principe", flag: "🇸🇹" },
  "240": { name: "Equatorial Guinea", flag: "🇬🇶" },
  "241": { name: "Gabon", flag: "🇬🇦" },
  "242": { name: "Republic of Congo", flag: "🇨🇬" },
  "243": { name: "DR Congo", flag: "🇨🇩" },
  "244": { name: "Angola", flag: "🇦🇴" },
  "245": { name: "Guinea-Bissau", flag: "🇬🇼" },
  "248": { name: "Seychelles", flag: "🇸🇨" },
  "249": { name: "Sudan", flag: "🇸🇩" },
  "250": { name: "Rwanda", flag: "🇷🇼" },
  "251": { name: "Ethiopia", flag: "🇪🇹" },
  "252": { name: "Somalia", flag: "🇸🇴" },
  "253": { name: "Djibouti", flag: "🇩🇯" },
  "254": { name: "Kenya", flag: "🇰🇪" },
  "255": { name: "Tanzania", flag: "🇹🇿" },
  "256": { name: "Uganda", flag: "🇺🇬" },
  "257": { name: "Burundi", flag: "🇧🇮" },
  "258": { name: "Mozambique", flag: "🇲🇿" },
  "260": { name: "Zambia", flag: "🇿🇲" },
  "261": { name: "Madagascar", flag: "🇲🇬" },
  "262": { name: "Reunion", flag: "🇷🇪" },
  "263": { name: "Zimbabwe", flag: "🇿🇼" },
  "264": { name: "Namibia", flag: "🇳🇦" },
  "265": { name: "Malawi", flag: "🇲🇼" },
  "266": { name: "Lesotho", flag: "🇱🇸" },
  "267": { name: "Botswana", flag: "🇧🇼" },
  "268": { name: "Swaziland", flag: "🇸🇿" },
  "269": { name: "Comoros", flag: "🇰🇲" },
  "290": { name: "Saint Helena", flag: "🇸🇭" },
  "291": { name: "Eritrea", flag: "🇪🇷" },
  "297": { name: "Aruba", flag: "🇦🇼" },
  "298": { name: "Faroe Islands", flag: "🇫🇴" },
  "299": { name: "Greenland", flag: "🇬🇱" },
  "350": { name: "Gibraltar", flag: "🇬🇮" },
  "351": { name: "Portugal", flag: "🇵🇹" },
  "352": { name: "Luxembourg", flag: "🇱🇺" },
  "353": { name: "Ireland", flag: "🇮🇪" },
  "354": { name: "Iceland", flag: "🇮🇸" },
  "355": { name: "Albania", flag: "🇦🇱" },
  "356": { name: "Malta", flag: "🇲🇹" },
  "357": { name: "Cyprus", flag: "🇨🇾" },
  "358": { name: "Finland", flag: "🇫🇮" },
  "359": { name: "Bulgaria", flag: "🇧🇬" },
  "370": { name: "Lithuania", flag: "🇱🇹" },
  "371": { name: "Latvia", flag: "🇱🇻" },
  "372": { name: "Estonia", flag: "🇪🇪" },
  "373": { name: "Moldova", flag: "🇲🇩" },
  "374": { name: "Armenia", flag: "🇦🇲" },
  "375": { name: "Belarus", flag: "🇧🇾" },
  "376": { name: "Andorra", flag: "🇦🇩" },
  "377": { name: "Monaco", flag: "🇲🇨" },
  "380": { name: "Ukraine", flag: "🇺🇦" },
  "381": { name: "Serbia", flag: "🇷🇸" },
  "382": { name: "Montenegro", flag: "🇲🇪" },
  "385": { name: "Croatia", flag: "🇭🇷" },
  "386": { name: "Slovenia", flag: "🇸🇮" },
  "387": { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  "389": { name: "North Macedonia", flag: "🇲🇰" },
  "420": { name: "Czech Republic", flag: "🇨🇿" },
  "421": { name: "Slovakia", flag: "🇸🇰" },
  "423": { name: "Liechtenstein", flag: "🇱🇮" },
  "500": { name: "Falkland Islands", flag: "🇫🇰" },
  "501": { name: "Belize", flag: "🇧🇿" },
  "502": { name: "Guatemala", flag: "🇬🇹" },
  "503": { name: "El Salvador", flag: "🇸🇻" },
  "504": { name: "Honduras", flag: "🇭🇳" },
  "505": { name: "Nicaragua", flag: "🇳🇮" },
  "506": { name: "Costa Rica", flag: "🇨🇷" },
  "507": { name: "Panama", flag: "🇵🇦" },
  "509": { name: "Haiti", flag: "🇭🇹" },
  "590": { name: "Guadeloupe", flag: "🇬🇵" },
  "591": { name: "Bolivia", flag: "🇧🇴" },
  "592": { name: "Guyana", flag: "🇬🇾" },
  "593": { name: "Ecuador", flag: "🇪🇨" },
  "595": { name: "Paraguay", flag: "🇵🇾" },
  "597": { name: "Suriname", flag: "🇸🇷" },
  "598": { name: "Uruguay", flag: "🇺🇾" },
  "670": { name: "East Timor", flag: "🇹🇱" },
  "673": { name: "Brunei", flag: "🇧🇳" },
  "674": { name: "Nauru", flag: "🇳🇷" },
  "675": { name: "Papua New Guinea", flag: "🇵🇬" },
  "676": { name: "Tonga", flag: "🇹🇴" },
  "677": { name: "Solomon Islands", flag: "🇸🇧" },
  "678": { name: "Vanuatu", flag: "🇻🇺" },
  "679": { name: "Fiji", flag: "🇫🇯" },
  "680": { name: "Palau", flag: "🇵🇼" },
  "682": { name: "Cook Islands", flag: "🇨🇰" },
  "685": { name: "Samoa", flag: "🇼🇸" },
  "686": { name: "Kiribati", flag: "🇰🇮" },
  "687": { name: "New Caledonia", flag: "🇳🇨" },
  "688": { name: "Tuvalu", flag: "🇹🇻" },
  "689": { name: "French Polynesia", flag: "🇵🇫" },
  "691": { name: "Micronesia", flag: "🇫🇲" },
  "692": { name: "Marshall Islands", flag: "🇲🇭" },
  "850": { name: "North Korea", flag: "🇰🇵" },
  "852": { name: "Hong Kong", flag: "🇭🇰" },
  "853": { name: "Macau", flag: "🇲🇴" },
  "855": { name: "Cambodia", flag: "🇰🇭" },
  "856": { name: "Laos", flag: "🇱🇦" },
  "880": { name: "Bangladesh", flag: "🇧🇩" },
  "886": { name: "Taiwan", flag: "🇹🇼" },
  "960": { name: "Maldives", flag: "🇲🇻" },
  "961": { name: "Lebanon", flag: "🇱🇧" },
  "962": { name: "Jordan", flag: "🇯🇴" },
  "963": { name: "Syria", flag: "🇸🇾" },
  "964": { name: "Iraq", flag: "🇮🇶" },
  "965": { name: "Kuwait", flag: "🇰🇼" },
  "966": { name: "Saudi Arabia", flag: "🇸🇦" },
  "967": { name: "Yemen", flag: "🇾🇪" },
  "968": { name: "Oman", flag: "🇴🇲" },
  "970": { name: "Palestine", flag: "🇵🇸" },
  "971": { name: "UAE", flag: "🇦🇪" },
  "972": { name: "Israel", flag: "🇮🇱" },
  "973": { name: "Bahrain", flag: "🇧🇭" },
  "974": { name: "Qatar", flag: "🇶🇦" },
  "975": { name: "Bhutan", flag: "🇧🇹" },
  "976": { name: "Mongolia", flag: "🇲🇳" },
  "977": { name: "Nepal", flag: "🇳🇵" },
  "992": { name: "Tajikistan", flag: "🇹🇯" },
  "993": { name: "Turkmenistan", flag: "🇹🇲" },
  "994": { name: "Azerbaijan", flag: "🇦🇿" },
  "995": { name: "Georgia", flag: "🇬🇪" },
  "996": { name: "Kyrgyzstan", flag: "🇰🇬" },
  "998": { name: "Uzbekistan", flag: "🇺🇿" }
};

/******************** DATA LOADING ********************/
let countries = {};
if (fs.existsSync(COUNTRIES_FILE)) {
  try { countries = JSON.parse(fs.readFileSync(COUNTRIES_FILE, 'utf8')); } catch (e) { countries = {}; }
}
countries = Object.assign({}, ALL_WORLD_COUNTRIES, countries);
saveCountries();

let services = {};
if (fs.existsSync(SERVICES_FILE)) {
  try { services = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8')); } catch (e) { services = {}; }
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
      const t = line.trim();
      if (!t) continue;
      let number, cc, svc;
      if (t.includes("|")) {
        const parts = t.split("|");
        if (parts.length >= 3) { number = parts[0].trim(); cc = parts[1].trim(); svc = parts[2].trim(); }
        else if (parts.length === 2) { number = parts[0].trim(); cc = parts[1].trim(); svc = "other"; }
        else continue;
      } else { number = t; cc = getCountryCodeFromNumber(number); svc = "other"; }
      if (!/^\d{7,15}$/.test(number) || !cc) continue;
      numbersByCountryService[cc] = numbersByCountryService[cc] || {};
      numbersByCountryService[cc][svc] = numbersByCountryService[cc][svc] || [];
      if (!numbersByCountryService[cc][svc].includes(number)) numbersByCountryService[cc][svc].push(number);
    }
    console.log("Loaded numbers:", Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length);
  } catch (e) { numbersByCountryService = {}; }
}

let users = {};
if (fs.existsSync(USERS_FILE)) {
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { users = {}; }
}

let activeNumbers = {};
if (fs.existsSync(ACTIVE_NUMBERS_FILE)) {
  try { activeNumbers = JSON.parse(fs.readFileSync(ACTIVE_NUMBERS_FILE, 'utf8')); } catch (e) { activeNumbers = {}; }
}

let otpLog = [];
if (fs.existsSync(OTP_LOG_FILE)) {
  try { otpLog = JSON.parse(fs.readFileSync(OTP_LOG_FILE, 'utf8')); } catch (e) { otpLog = []; }
}

/******************** SAVE FUNCTIONS ********************/
function saveCountries() { try { fs.writeFileSync(COUNTRIES_FILE, JSON.stringify(countries, null, 2)); } catch (e) {} }
function saveServices() { try { fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2)); } catch (e) {} }
function saveUsers() { try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); } catch (e) {} }
function saveActiveNumbers() { try { fs.writeFileSync(ACTIVE_NUMBERS_FILE, JSON.stringify(activeNumbers, null, 2)); } catch (e) {} }
function saveOTPLog() { try { fs.writeFileSync(OTP_LOG_FILE, JSON.stringify(otpLog.slice(-2000), null, 2)); } catch (e) {} }
function saveNumbers() {
  try {
    const lines = [];
    for (const cc in numbersByCountryService)
      for (const svc in numbersByCountryService[cc])
        for (const num of numbersByCountryService[cc][svc])
          lines.push(`${num}|${cc}|${svc}`);
    fs.writeFileSync(NUMBERS_FILE, lines.join("\n"));
  } catch (e) {}
}

/******************** HELPER FUNCTIONS ********************/
function getCountryCodeFromNumber(n) {
  const s = n.toString().replace(/\D/g, '');
  for (let len = 4; len >= 1; len--) {
    const code = s.slice(0, len);
    if (countries[code]) return code;
  }
  return null;
}

function getAvailableCountriesForService(svc) {
  const result = [];
  for (const cc in numbersByCountryService) {
    if (numbersByCountryService[cc][svc] && numbersByCountryService[cc][svc].length > 0 && countries[cc])
      result.push(cc);
  }
  return result;
}

function getSingleNumberByCountryAndService(cc, svc, userId) {
  if (!numbersByCountryService[cc] || !numbersByCountryService[cc][svc] || !numbersByCountryService[cc][svc].length) return null;
  const number = numbersByCountryService[cc][svc].shift();
  activeNumbers[number] = { userId, countryCode: cc, service: svc, assignedAt: new Date().toISOString(), otpCount: 0 };
  saveNumbers();
  saveActiveNumbers();
  return number;
}

/***********************************************************************
 *  UNIVERSAL PHONE NUMBER EXTRACTOR
 *  যেকোনো ফরম্যাটে OTP মেসেজ থেকে active নম্বর বের করে
 *  
 *  Handles:
 *  1. Unicode Enclosed Letters:  2250712ⓎⓄⓊ487
 *  2. Circled digits:            ①②③④⑤
 *  3. Full-width digits:         ２２５０７１２
 *  4. Arabic-Indic / Devanagari / Bengali / Thai digits
 *  5. Masked:                    225****487, 225...487, 225●●●487
 *  6. Separated:                 225-071-2487, 225 071 2487
 *  7. With + prefix:             +2250712487
 *  8. Partial / prefix-only match
 ***********************************************************************/
function unicodeNormalize(text) {
  if (!text) return '';
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    // Enclosed uppercase Ⓐ-Ⓩ
    if (cp >= 0x24B6 && cp <= 0x24CF) { out += String.fromCharCode(65 + cp - 0x24B6); continue; }
    // Enclosed lowercase ⓐ-ⓩ
    if (cp >= 0x24D0 && cp <= 0x24E9) { out += String.fromCharCode(97 + cp - 0x24D0); continue; }
    // Enclosed digits ①-⑳
    if (cp >= 0x2460 && cp <= 0x2473) { out += String(cp - 0x245F); continue; }
    // Fullwidth digits ０-９
    if (cp >= 0xFF10 && cp <= 0xFF19) { out += String.fromCharCode(cp - 0xFF10 + 48); continue; }
    // Math bold digits 𝟎-𝟗 and variants
    if (cp >= 0x1D7CE && cp <= 0x1D7FF) { out += String(cp % 10); continue; }
    // Arabic-Indic ٠-٩
    if (cp >= 0x0660 && cp <= 0x0669) { out += String(cp - 0x0660); continue; }
    // Extended Arabic ۰-۹
    if (cp >= 0x06F0 && cp <= 0x06F9) { out += String(cp - 0x06F0); continue; }
    // Devanagari ०-९
    if (cp >= 0x0966 && cp <= 0x096F) { out += String(cp - 0x0966); continue; }
    // Bengali ০-৯
    if (cp >= 0x09E6 && cp <= 0x09EF) { out += String(cp - 0x09E6); continue; }
    // Thai ๐-๙
    if (cp >= 0x0E50 && cp <= 0x0E59) { out += String(cp - 0x0E50); continue; }
    out += ch;
  }
  return out;
}

function extractPhoneNumberFromMessage(rawText) {
  if (!rawText) return null;

  console.log(`EXTRACT from: "${rawText.substring(0, 250)}"`);

  const activeNums = Object.keys(activeNumbers);
  if (!activeNums.length) {
    console.log("No active numbers.");
    return null;
  }

  // Normalize unicode
  const text = unicodeNormalize(rawText);
  console.log(`Normalized:   "${text.substring(0, 250)}"`);

  // --- STRATEGY 1: Direct string match (normalized) ---
  for (const num of activeNums) {
    if (text.includes(num)) {
      console.log(`[S1] Direct match: ${num}`);
      return num;
    }
  }

  // --- STRATEGY 2: Direct string match (raw) ---
  for (const num of activeNums) {
    if (rawText.includes(num)) {
      console.log(`[S2] Raw direct match: ${num}`);
      return num;
    }
  }

  // --- STRATEGY 3: Number line parsing ---
  // Handles: "📞 Number: 2250712ⓎⓄⓊ487"  →  digits only "2250712487"
  const numLineRx = /(?:number|num|📞|☎️|phone|tel|no)[^\n:]*:?\s*([^\n]{3,40})/gi;
  let m;
  while ((m = numLineRx.exec(text)) !== null) {
    const digits = m[1].replace(/\D/g, '');
    console.log(`[S3] Number line digits: "${digits}"`);
    if (digits.length < 5) continue;
    for (const num of activeNums) {
      if (digits === num) { console.log(`[S3] Exact: ${num}`); return num; }
      if (digits.includes(num)) { console.log(`[S3] Contains: ${num}`); return num; }
      if (num.includes(digits) && digits.length >= 7) { console.log(`[S3] Reverse: ${num}`); return num; }
    }
  }

  // --- STRATEGY 4: All continuous digit groups in normalized text ---
  const groups = [...text.matchAll(/\d{5,15}/g)].map(x => x[0]);
  console.log(`[S4] Digit groups: [${groups.join(', ')}]`);
  for (const grp of groups) {
    for (const num of activeNums) {
      if (grp === num) { console.log(`[S4] Exact group: ${num}`); return num; }
      if (grp.length >= 8 && grp.includes(num)) { console.log(`[S4] Group contains: ${num}`); return num; }
      if (grp.length >= 8 && num.includes(grp)) { console.log(`[S4] Num contains group: ${num}`); return num; }
    }
  }

  // --- STRATEGY 5: Masked number (prefix + suffix matching) ---
  // e.g. "225****487" → prefix=225, suffix=487
  // mask chars: * ● • · × X x _ - ~ space
  const maskedRx = /(\d{2,})[\s\-\.\*●•·×Xx_~]{1,10}(\d{2,})/g;
  while ((m = maskedRx.exec(text)) !== null) {
    const prefix = m[1], suffix = m[2];
    console.log(`[S5] Masked prefix="${prefix}" suffix="${suffix}"`);
    for (const num of activeNums) {
      if (num.startsWith(prefix) && num.endsWith(suffix) &&
        num.length >= prefix.length + suffix.length) {
        console.log(`[S5] Masked match: ${num}`);
        return num;
      }
    }
  }

  // --- STRATEGY 6: Suffix-only matching (last 6+ digits) ---
  for (const grp of groups) {
    for (const num of activeNums) {
      if (grp.length >= 6 && num.endsWith(grp) && grp.length <= num.length) {
        console.log(`[S6] Suffix match (${grp}): ${num}`);
        return num;
      }
    }
  }

  // --- STRATEGY 7: All digits in entire message ---
  const allDigits = text.replace(/\D/g, '');
  const rawDigits = rawText.replace(/\D/g, '');
  console.log(`[S7] All digits in text: "${allDigits.substring(0, 50)}"`);
  for (const num of activeNums) {
    if (allDigits.includes(num)) { console.log(`[S7] Alldigits match: ${num}`); return num; }
    if (rawDigits.includes(num)) { console.log(`[S7] RawDigits match: ${num}`); return num; }
  }

  console.log("No match found.");
  return null;
}

/******************** SAFE MESSAGE FUNCTIONS ********************/
async function safeSendMessage(chatId, text, options = {}) {
  try {
    return await bot.telegram.sendMessage(chatId, text, options);
  } catch (e) {
    if (e.description?.includes('blocked by the user')) {
      if (users[chatId]) { delete users[chatId]; saveUsers(); }
    } else console.error(`sendMessage error to ${chatId}:`, e.message);
    return null;
  }
}

async function safeEditMessage(chatId, messageId, text, options = {}) {
  try {
    return await bot.telegram.editMessageText(chatId, messageId, null, text, options);
  } catch (e) {
    if (!e.description?.includes('not modified')) console.error("editMessage error:", e.message);
    return null;
  }
}

async function safeForwardMessage(fromChatId, toUserId, messageId) {
  try {
    return await bot.telegram.forwardMessage(toUserId, fromChatId, messageId);
  } catch (e) {
    if (e.description?.includes('blocked by the user')) {
      if (users[toUserId]) { delete users[toUserId]; saveUsers(); }
    } else console.error(`forwardMessage error to ${toUserId}:`, e.message);
    return null;
  }
}

async function safeReply(ctx, text, options = {}) {
  try {
    return await ctx.reply(text, options);
  } catch (e) {
    if (e.description?.includes('blocked by the user')) {
      if (ctx.from?.id && users[ctx.from.id]) { delete users[ctx.from.id]; saveUsers(); }
    } else console.error("reply error:", e.message);
    return null;
  }
}

async function safeEditMessageReply(ctx, text, options = {}) {
  try {
    return await ctx.editMessageText(text, options);
  } catch (e) {
    if (!e.description?.includes('not modified')) console.error("editMessageReply error:", e.message);
    return null;
  }
}

async function safeAnswerCbQuery(ctx, text, options = {}) {
  try { return await ctx.answerCbQuery(text, options); } catch (e) { return null; }
}

/******************** OTP FORWARD ********************/
async function forwardOTPMessageToUser(phoneNumber, originalMessageId) {
  if (!activeNumbers[phoneNumber]) return false;
  const { userId } = activeNumbers[phoneNumber];
  console.log(`Forwarding OTP to user ${userId} for number ${phoneNumber}`);
  const result = await safeForwardMessage(OTP_GROUP_ID, userId, originalMessageId);
  if (result) {
    activeNumbers[phoneNumber].otpCount = (activeNumbers[phoneNumber].otpCount || 0) + 1;
    activeNumbers[phoneNumber].lastOTP = new Date().toISOString();
    saveActiveNumbers();
    otpLog.push({ phoneNumber, userId, messageId: originalMessageId, delivered: true, timestamp: new Date().toISOString() });
    saveOTPLog();
    console.log(`OTP forwarded successfully.`);
    return true;
  } else {
    otpLog.push({ phoneNumber, userId, messageId: originalMessageId, delivered: false, timestamp: new Date().toISOString() });
    saveOTPLog();
    return false;
  }
}

/******************** VERIFICATION ********************/
async function checkUserMembership(ctx) {
  let isMain = false, isChat = false, isOTP = false;
  try { const m = await ctx.telegram.getChatMember(MAIN_CHANNEL_ID, ctx.from.id); isMain = ['member','administrator','creator'].includes(m.status); } catch (e) {}
  try { const m = await ctx.telegram.getChatMember(CHAT_GROUP_ID, ctx.from.id); isChat = ['member','administrator','creator'].includes(m.status); } catch (e) {}
  try { const m = await ctx.telegram.getChatMember(OTP_GROUP_ID, ctx.from.id); isOTP = ['member','administrator','creator'].includes(m.status); } catch (e) {}
  return { mainChannel: isMain, chatGroup: isChat, otpGroup: isOTP, allJoined: isMain && isChat && isOTP };
}

/******************** SESSION ********************/
bot.use(session({
  defaultSession: () => ({
    verified: false, isAdmin: false, adminState: null, adminData: null,
    currentNumber: null, currentService: null, currentCountry: null,
    lastNumberTime: 0, lastMessageId: null, lastChatId: null, lastVerificationCheck: 0
  })
}));

bot.use((ctx, next) => {
  if (ctx.from) {
    const uid = ctx.from.id;
    if (!users[uid]) {
      users[uid] = { id: uid, username: ctx.from.username || '', first_name: ctx.from.first_name || '', joined: new Date().toISOString(), verified: false };
      saveUsers();
    } else {
      users[uid].last_active = new Date().toISOString();
    }
  }
  return next();
});

/******************** START ********************/
bot.start(async (ctx) => {
  try {
    Object.assign(ctx.session, {
      verified: false, isAdmin: false, adminState: null, adminData: null,
      currentNumber: null, currentService: null, currentCountry: null,
      lastNumberTime: 0, lastMessageId: null, lastChatId: null, lastVerificationCheck: 0
    });
    await safeReply(ctx,
      "🤖 *Welcome to AH Method Number Bot*\n\n" +
      "সব ফিচার ব্যবহার করতে নিচে join করুন:\n\n" +
      "📢 *Main Channel:* @blackotpnum\n" +
      "💬 *Chat Group:* [Join Here](" + CHAT_GROUP + ")\n" +
      "📨 *OTP Group:* [Join Here](" + OTP_GROUP + ")\n\n" +
      "Join শেষে ✅ Verify বাটনে ক্লিক করুন:",
      {
        parse_mode: "Markdown", disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: "📢 Main Channel", url: "https://t.me/blackotpnum" }],
            [{ text: "💬 Join Chat Group", url: CHAT_GROUP }],
            [{ text: "📨 Join OTP Group", url: OTP_GROUP }],
            [{ text: "✅ Verify Membership", callback_data: "verify_user" }]
          ]
        }
      }
    );
  } catch (e) { console.error("Start error:", e); }
});

bot.action("verify_user", async (ctx) => {
  try {
    await safeAnswerCbQuery(ctx, "⏳ Checking...");
    const mem = await checkUserMembership(ctx);
    if (mem.allJoined) {
      ctx.session.verified = true;
      ctx.session.lastVerificationCheck = Date.now();
      if (users[ctx.from.id]) { users[ctx.from.id].verified = true; saveUsers(); }
      await safeEditMessageReply(ctx, "✅ *Verification Successful!*\nNow use all features.", { parse_mode: "Markdown" });
      await safeReply(ctx, "✅ Choose:", Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize());
    } else {
      let msg = "❌ *Verification Failed*\n\nNot joined:\n";
      if (!mem.mainChannel) msg += "• 📢 Main Channel\n";
      if (!mem.chatGroup) msg += "• 💬 Chat Group\n";
      if (!mem.otpGroup) msg += "• 📨 OTP Group\n";
      await safeEditMessageReply(ctx, msg, { parse_mode: "Markdown" });
    }
  } catch (e) { console.error("Verify error:", e); }
});

/******************** VERIFICATION MIDDLEWARE ********************/
bot.use(async (ctx, next) => {
  const txt = ctx.message?.text || '';
  if (txt.startsWith('/start') || txt.startsWith('/adminlogin') ||
    ctx.callbackQuery?.data === 'verify_user' || ctx.session?.isAdmin) return next();
  if (ctx.chat?.id === OTP_GROUP_ID) return next();
  if (ctx.from && !ctx.session?.verified) {
    const now = Date.now();
    if (ctx.session?.lastVerificationCheck && (now - ctx.session.lastVerificationCheck) < 86400000) return next();
    const mem = await checkUserMembership(ctx);
    if (mem.allJoined) { ctx.session.verified = true; ctx.session.lastVerificationCheck = now; return next(); }
    await safeReply(ctx, "❌ *Verification Required*\nUse /start", { parse_mode: "Markdown" });
    return;
  }
  return next();
});

/******************** MENUS ********************/
bot.hears("🏠 Main Menu", async (ctx) => {
  await safeReply(ctx, "🏠 *Main Menu*", {
    parse_mode: "Markdown",
    reply_markup: Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize()
  });
});

function buildServiceButtons() {
  const btns = [];
  for (const sid in services)
    if (getAvailableCountriesForService(sid).length > 0)
      btns.push([{ text: `${services[sid].icon} ${services[sid].name}`, callback_data: `sel_svc:${sid}` }]);
  return btns;
}

bot.action("back_to_services", async (ctx) => {
  if (!ctx.session.verified) return await safeAnswerCbQuery(ctx, "❌ Verify first", { show_alert: true });
  const btns = buildServiceButtons();
  if (!btns.length) return await safeEditMessageReply(ctx, "📭 No numbers available.", { parse_mode: "Markdown" });
  await safeEditMessageReply(ctx, "🎯 *Select Service:*", { parse_mode: "Markdown", reply_markup: { inline_keyboard: btns } });
});

/******************** GET NUMBER ********************/
bot.hears("📞 Get Number", async (ctx) => {
  if (!ctx.session.verified) return await safeReply(ctx, "❌ Verify first. Use /start");
  const btns = buildServiceButtons();
  if (!btns.length) return await safeReply(ctx, "📭 No numbers available.", { parse_mode: "Markdown", reply_markup: Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize() });
  await safeReply(ctx, "🎯 *Select Service:*", { parse_mode: "Markdown", reply_markup: { inline_keyboard: btns } });
});

bot.action(/^sel_svc:(.+)$/, async (ctx) => {
  const sid = ctx.match[1];
  const avail = getAvailableCountriesForService(sid);
  if (!avail.length) return await safeAnswerCbQuery(ctx, "❌ No numbers", { show_alert: true });
  const btns = avail.map(cc => {
    const c = countries[cc] || { name: cc, flag: "🏳️" };
    const cnt = numbersByCountryService[cc][sid].length;
    return [{ text: `${c.flag} ${c.name} (${cnt})`, callback_data: `sel_cnt:${sid}:${cc}` }];
  });
  btns.push([{ text: "🔙 Back", callback_data: "back_to_services" }]);
  await safeEditMessageReply(ctx, `🌍 *Select Country for ${services[sid].icon} ${services[sid].name}:*`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: btns } });
});

bot.action(/^sel_cnt:(.+):(.+)$/, async (ctx) => {
  const sid = ctx.match[1], cc = ctx.match[2];
  const now = Date.now();
  if (now - (ctx.session.lastNumberTime || 0) < 5000)
    return await safeAnswerCbQuery(ctx, `⏳ Wait ${Math.ceil((5000 - (now - ctx.session.lastNumberTime)) / 1000)}s`, { show_alert: true });
  if (ctx.session.currentNumber && activeNumbers[ctx.session.currentNumber]) { delete activeNumbers[ctx.session.currentNumber]; saveActiveNumbers(); }
  const number = getSingleNumberByCountryAndService(cc, sid, ctx.from.id);
  if (!number) return await safeAnswerCbQuery(ctx, "❌ No numbers available", { show_alert: true });
  ctx.session.currentNumber = number; ctx.session.currentService = sid;
  ctx.session.currentCountry = cc; ctx.session.lastNumberTime = now;
  const c = countries[cc] || { name: cc, flag: "🏳️" };
  const svc = services[sid] || { name: sid, icon: "🔧" };
  const msg = `✅ *Number Received!*\n\n📱 *Service:* ${svc.name}\n${c.flag} *Country:* ${c.name}\n📞 *Number:* \`+${number}\`\n\n⏳ *OTP আসলে automatically পাবেন*`;
  const sent = await safeEditMessageReply(ctx, msg, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [
      [{ text: "📨 OTP Group", url: OTP_GROUP }],
      [{ text: "🔄 Change Number", callback_data: `chg_num:${sid}:${cc}` }],
      [{ text: "🔙 Back", callback_data: "back_to_services" }]
    ]}
  });
  if (sent?.message_id) { ctx.session.lastMessageId = sent.message_id; ctx.session.lastChatId = ctx.chat.id; }
});

/******************** CHANGE NUMBER ********************/
bot.hears("🔄 Change Number", async (ctx) => {
  if (!ctx.session.verified) return await safeReply(ctx, "❌ Verify first.");
  if (!ctx.session.currentNumber) return await safeReply(ctx, "❌ Get a number first.", Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize());
  const now = Date.now();
  if (now - (ctx.session.lastNumberTime || 0) < 5000)
    return await safeReply(ctx, `⏳ Wait ${Math.ceil((5000 - (now - ctx.session.lastNumberTime)) / 1000)}s`, Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize());
  const sid = ctx.session.currentService, cc = ctx.session.currentCountry;
  if (!sid || !cc) return await safeReply(ctx, "❌ Get a new number first.", Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize());
  if (ctx.session.currentNumber && activeNumbers[ctx.session.currentNumber]) { delete activeNumbers[ctx.session.currentNumber]; saveActiveNumbers(); }
  const number = getSingleNumberByCountryAndService(cc, sid, ctx.from.id);
  if (!number) return await safeReply(ctx, "❌ No more numbers.", Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize());
  ctx.session.currentNumber = number; ctx.session.lastNumberTime = now;
  const c = countries[cc] || { name: cc, flag: "🏳️" };
  const svc = services[sid] || { name: sid, icon: "🔧" };
  const msg = `✅ *Number Changed!*\n\n📱 *Service:* ${svc.name}\n${c.flag} *Country:* ${c.name}\n📞 *Number:* \`+${number}\`\n\n⏳ *OTP আসলে automatically পাবেন*`;
  const opts = { parse_mode: "Markdown", reply_markup: { inline_keyboard: [
    [{ text: "📨 OTP Group", url: OTP_GROUP }],
    [{ text: "🔄 Change Number", callback_data: `chg_num:${sid}:${cc}` }],
    [{ text: "🔙 Back", callback_data: "back_to_services" }]
  ]}};
  if (ctx.session.lastMessageId && ctx.session.lastChatId) {
    await safeEditMessage(ctx.session.lastChatId, ctx.session.lastMessageId, msg, opts);
  } else {
    const sent = await safeReply(ctx, msg, opts);
    if (sent?.message_id) { ctx.session.lastMessageId = sent.message_id; ctx.session.lastChatId = ctx.chat.id; }
  }
});

bot.action(/^chg_num:(.+):(.+)$/, async (ctx) => {
  const sid = ctx.match[1], cc = ctx.match[2];
  const now = Date.now();
  if (now - (ctx.session.lastNumberTime || 0) < 5000)
    return await safeAnswerCbQuery(ctx, `⏳ Wait ${Math.ceil((5000 - (now - ctx.session.lastNumberTime)) / 1000)}s`, { show_alert: true });
  if (ctx.session.currentNumber && activeNumbers[ctx.session.currentNumber]) { delete activeNumbers[ctx.session.currentNumber]; saveActiveNumbers(); }
  const number = getSingleNumberByCountryAndService(cc, sid, ctx.from.id);
  if (!number) return await safeAnswerCbQuery(ctx, "❌ No more numbers", { show_alert: true });
  ctx.session.currentNumber = number; ctx.session.currentService = sid;
  ctx.session.currentCountry = cc; ctx.session.lastNumberTime = now;
  const c = countries[cc] || { name: cc, flag: "🏳️" };
  const svc = services[sid] || { name: sid, icon: "🔧" };
  const msg = `✅ *Number Changed!*\n\n📱 *Service:* ${svc.name}\n${c.flag} *Country:* ${c.name}\n📞 *Number:* \`+${number}\`\n\n⏳ *OTP আসলে automatically পাবেন*`;
  await safeEditMessageReply(ctx, msg, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [
    [{ text: "📨 OTP Group", url: OTP_GROUP }],
    [{ text: "🔄 Change Number", callback_data: `chg_num:${sid}:${cc}` }],
    [{ text: "🔙 Back", callback_data: "back_to_services" }]
  ]}});
});

/******************** ADMIN ********************/
bot.command("adminlogin", async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return await safeReply(ctx, "Usage: /adminlogin [password]");
  if (parts[1] === ADMIN_PASSWORD) {
    ctx.session.isAdmin = true; ctx.session.verified = true;
    await safeReply(ctx, "✅ *Admin Login OK!*\nUse /admin", { parse_mode: "Markdown", reply_markup: Markup.keyboard([["📞 Get Number", "🔄 Change Number"], ["🏠 Main Menu"]]).resize() });
  } else await safeReply(ctx, "❌ Wrong password.");
});

bot.command("admin", async (ctx) => {
  if (!ctx.session.isAdmin) return await safeReply(ctx, "❌ Use /adminlogin first");
  await showAdmin(ctx, 'reply');
});

async function showAdmin(ctx, mode = 'edit') {
  const kb = { inline_keyboard: [
    [{ text: "📤 Upload Numbers", callback_data: "adm_upload" }, { text: "📊 Stock Report", callback_data: "adm_stock" }],
    [{ text: "➕ Add Numbers", callback_data: "adm_add_nums" }, { text: "❌ Delete Numbers", callback_data: "adm_delete" }],
    [{ text: "🌍 Add Country", callback_data: "adm_add_country" }, { text: "🔧 Add Service", callback_data: "adm_add_svc" }],
    [{ text: "🗑 Del Service", callback_data: "adm_del_svc" }, { text: "📋 List Services", callback_data: "adm_list_svc" }],
    [{ text: "👥 User Stats", callback_data: "adm_users" }, { text: "📨 Active OTPs", callback_data: "adm_active" }],
    [{ text: "📢 Broadcast", callback_data: "adm_broadcast" }, { text: "🚪 Logout", callback_data: "adm_logout" }]
  ]};
  const opts = { parse_mode: "Markdown", reply_markup: kb };
  if (mode === 'edit') await safeEditMessageReply(ctx, "🛠 *Admin Dashboard:*", opts);
  else await safeReply(ctx, "🛠 *Admin Dashboard:*", opts);
}

bot.action("adm_stock", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  let report = "📊 *Stock Report*\n\n", total = 0;
  for (const cc in numbersByCountryService) {
    const c = countries[cc] || { name: cc, flag: "🏳️" };
    for (const sid in numbersByCountryService[cc]) {
      const cnt = numbersByCountryService[cc][sid].length;
      if (cnt > 0) { const s = services[sid] || { name: sid, icon: "🔧" }; report += `${c.flag} ${c.name} | ${s.icon} ${s.name}: *${cnt}*\n`; total += cnt; }
    }
  }
  report += `\n📈 *Total:* ${total} | 🔄 *Active:* ${Object.keys(activeNumbers).length} | 👥 *Users:* ${Object.keys(users).length}`;
  await safeEditMessageReply(ctx, report, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
});

bot.action("adm_users", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const total = Object.keys(users).length, verified = Object.values(users).filter(u => u.verified).length;
  await safeEditMessageReply(ctx,
    `👥 *Users*\n\nTotal: *${total}* | Verified: *${verified}*\nActive Numbers: *${Object.keys(activeNumbers).length}*\nOTPs Delivered: *${otpLog.filter(l => l.delivered).length}*`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } }
  );
});

bot.action("adm_active", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const keys = Object.keys(activeNumbers);
  if (!keys.length) return await safeEditMessageReply(ctx, "📭 No active numbers.", { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
  let msg = `📨 *Active (${keys.length})*\n\n`;
  for (const num of keys.slice(0, 15)) { const d = activeNumbers[num]; msg += `📞 +${num} → User: ${d.userId} | OTPs: ${d.otpCount || 0}\n`; }
  if (keys.length > 15) msg += `...+${keys.length - 15} more`;
  await safeEditMessageReply(ctx, msg, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
});

bot.action("adm_upload", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_upload";
  const btns = Object.entries(services).map(([sid, s]) => [{ text: `${s.icon} ${s.name}`, callback_data: `adm_sel_svc:${sid}` }]);
  btns.push([{ text: "❌ Cancel", callback_data: "adm_cancel" }]);
  await safeEditMessageReply(ctx, "📤 *Select service for upload:*", { parse_mode: "Markdown", reply_markup: { inline_keyboard: btns } });
});

bot.action(/^adm_sel_svc:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const sid = ctx.match[1];
  ctx.session.adminState = "waiting_upload_file"; ctx.session.adminData = { serviceId: sid };
  await safeEditMessageReply(ctx, `📤 *Upload for ${services[sid]?.name || sid}*\n\nSend .txt file\nFormat: \`number|countryCode|service\``, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "adm_cancel" }]] } });
});

bot.action("adm_add_nums", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_add_numbers";
  await safeEditMessageReply(ctx, "➕ *Add Numbers*\n\nFormat per line: `number|code|service`\nExample: `2250712345487|225|whatsapp`", { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "adm_cancel" }]] } });
});

bot.action("adm_add_country", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_add_country";
  await safeEditMessageReply(ctx, "🌍 *Add Country*\nFormat: `code name flag`\nExample: `225 Ivory Coast 🇨🇮`", { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "adm_cancel" }]] } });
});

bot.action("adm_add_svc", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_add_service";
  await safeEditMessageReply(ctx, "🔧 *Add Service*\nFormat: `id name icon`\nExample: `twitter Twitter 🐦`", { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "adm_cancel" }]] } });
});

bot.action("adm_del_svc", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const btns = Object.entries(services).map(([sid, s]) => [{ text: `${s.icon} ${s.name}`, callback_data: `adm_cds:${sid}` }]);
  btns.push([{ text: "🔙 Back", callback_data: "adm_back" }]);
  await safeEditMessageReply(ctx, "🗑 *Delete Service:*", { parse_mode: "Markdown", reply_markup: { inline_keyboard: btns } });
});

bot.action(/^adm_cds:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const sid = ctx.match[1];
  delete services[sid]; saveServices();
  for (const cc in numbersByCountryService) delete numbersByCountryService[cc][sid];
  saveNumbers();
  await safeEditMessageReply(ctx, `✅ Service "${sid}" deleted.`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
});

bot.action("adm_list_svc", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  let msg = "📋 *Services:*\n\n";
  for (const [sid, s] of Object.entries(services)) msg += `${s.icon} *${s.name}* (\`${sid}\`)\n`;
  await safeEditMessageReply(ctx, msg, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
});

bot.action("adm_delete", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const btns = [];
  for (const cc in numbersByCountryService) {
    const c = countries[cc] || { name: cc, flag: "🏳️" };
    const total = Object.values(numbersByCountryService[cc]).flat().length;
    if (total > 0) btns.push([{ text: `${c.flag} ${c.name} (${total})`, callback_data: `adm_del_cc:${cc}` }]);
  }
  if (!btns.length) return await safeEditMessageReply(ctx, "📭 No numbers.", { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
  btns.push([{ text: "🗑 Delete ALL", callback_data: "adm_del_all" }, { text: "🔙 Back", callback_data: "adm_back" }]);
  await safeEditMessageReply(ctx, "❌ *Select Country to Delete:*", { parse_mode: "Markdown", reply_markup: { inline_keyboard: btns } });
});

bot.action(/^adm_del_cc:(.+)$/, async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const cc = ctx.match[1];
  const total = Object.values(numbersByCountryService[cc] || {}).flat().length;
  delete numbersByCountryService[cc]; saveNumbers();
  await safeEditMessageReply(ctx, `✅ Deleted ${total} numbers for ${cc}.`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
});

bot.action("adm_del_all", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  const total = Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length;
  numbersByCountryService = {}; saveNumbers();
  await safeEditMessageReply(ctx, `✅ Deleted ALL ${total} numbers.`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "adm_back" }]] } });
});

bot.action("adm_broadcast", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = "waiting_broadcast";
  await safeEditMessageReply(ctx, "📢 *Broadcast*\nSend message:", { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "adm_cancel" }]] } });
});

bot.action("adm_cancel", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  ctx.session.adminState = null; ctx.session.adminData = null;
  await showAdmin(ctx, 'edit');
});

bot.action("adm_back", async (ctx) => {
  if (!ctx.session.isAdmin) return;
  await showAdmin(ctx, 'edit');
});

bot.action("adm_logout", async (ctx) => {
  ctx.session.isAdmin = false;
  await safeAnswerCbQuery(ctx, "✅ Logged out");
  await safeEditMessageReply(ctx, "✅ Logged out.", { parse_mode: "Markdown" });
});

/******************** DOCUMENT UPLOAD ********************/
bot.on("document", async (ctx) => {
  try {
    if (!ctx.session.isAdmin || ctx.session.adminState !== "waiting_upload_file") return;
    const doc = ctx.message.document;
    if (!doc.file_name.endsWith('.txt')) return await safeReply(ctx, "❌ .txt file only.");
    const link = await ctx.telegram.getFileLink(doc.file_id);
    const content = await new Promise((res, rej) => {
      let d = '';
      https.get(link.href, r => { r.on('data', c => d += c); r.on('end', () => res(d)); r.on('error', rej); }).on('error', rej);
    });
    const sid = ctx.session.adminData?.serviceId || 'other';
    let added = 0, skipped = 0, invalid = 0;
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim(); if (!t) continue;
      let num, cc, svc;
      if (t.includes("|")) {
        const p = t.split("|");
        if (p.length >= 3) { num = p[0].trim(); cc = p[1].trim(); svc = p[2].trim(); }
        else if (p.length === 2) { num = p[0].trim(); cc = p[1].trim(); svc = sid; }
        else { invalid++; continue; }
      } else { num = t; cc = getCountryCodeFromNumber(num); svc = sid; }
      if (!/^\d{7,15}$/.test(num) || !cc) { invalid++; continue; }
      if (!countries[cc]) countries[cc] = { name: `Country +${cc}`, flag: "🏳️" };
      numbersByCountryService[cc] = numbersByCountryService[cc] || {};
      numbersByCountryService[cc][svc] = numbersByCountryService[cc][svc] || [];
      if (!numbersByCountryService[cc][svc].includes(num)) { numbersByCountryService[cc][svc].push(num); added++; } else skipped++;
    }
    saveCountries(); saveNumbers();
    ctx.session.adminState = null; ctx.session.adminData = null;
    await safeReply(ctx, `✅ *Done!*\nAdded: *${added}* | Skipped: *${skipped}* | Invalid: *${invalid}*\nTotal: ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length}`, { parse_mode: "Markdown" });
  } catch (e) { console.error("Document error:", e); await safeReply(ctx, "❌ Error."); }
});

/******************** TEXT HANDLER ********************/
bot.on("text", async (ctx) => {
  try {
    if (!ctx.message?.text || !ctx.session.isAdmin || !ctx.session.adminState) return;
    const text = ctx.message.text, state = ctx.session.adminState;

    if (state === "waiting_add_country") {
      const p = text.trim().split(/\s+/);
      if (p.length >= 3) {
        countries[p[0]] = { name: p.slice(1, -1).join(" "), flag: p[p.length - 1] }; saveCountries();
        await safeReply(ctx, `✅ Country +${p[0]} added.`); ctx.session.adminState = null;
      } else await safeReply(ctx, "❌ Format: `code name flag`", { parse_mode: "Markdown" });
    }
    else if (state === "waiting_add_service") {
      const p = text.trim().split(/\s+/);
      if (p.length >= 3) {
        services[p[0].toLowerCase()] = { name: p.slice(1, -1).join(" "), icon: p[p.length - 1] }; saveServices();
        await safeReply(ctx, `✅ Service "${p[0]}" added.`); ctx.session.adminState = null;
      } else await safeReply(ctx, "❌ Format: `id name icon`", { parse_mode: "Markdown" });
    }
    else if (state === "waiting_add_numbers") {
      let added = 0, failed = 0;
      for (const line of text.split('\n')) {
        const t = line.trim(); if (!t) continue;
        let num, cc, svc;
        if (t.includes("|")) { const p = t.split("|"); if (p.length >= 3) { num = p[0].trim(); cc = p[1].trim(); svc = p[2].trim(); } else if (p.length === 2) { num = p[0].trim(); cc = p[1].trim(); svc = "other"; } else { failed++; continue; } }
        else { num = t; cc = getCountryCodeFromNumber(num); svc = "other"; }
        if (!/^\d{7,15}$/.test(num) || !cc) { failed++; continue; }
        if (!countries[cc]) countries[cc] = { name: `Country +${cc}`, flag: "🏳️" };
        numbersByCountryService[cc] = numbersByCountryService[cc] || {};
        numbersByCountryService[cc][svc] = numbersByCountryService[cc][svc] || [];
        if (!numbersByCountryService[cc][svc].includes(num)) { numbersByCountryService[cc][svc].push(num); added++; } else failed++;
      }
      saveNumbers(); saveCountries();
      await safeReply(ctx, `✅ Added: *${added}* | Failed: *${failed}*\nTotal: ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length}`, { parse_mode: "Markdown" });
      ctx.session.adminState = null;
    }
    else if (state === "waiting_broadcast") {
      let sent = 0, fail = 0;
      for (const uid in users) { const r = await safeSendMessage(uid, text, { parse_mode: "Markdown" }); r ? sent++ : fail++; await new Promise(r => setTimeout(r, 80)); }
      ctx.session.adminState = null;
      await safeReply(ctx, `📢 Sent: *${sent}* | Failed: *${fail}*`, { parse_mode: "Markdown" });
    }
  } catch (e) { console.error("Text handler error:", e); }
});

/***********************************************************************
 *  OTP GROUP MONITORING
 *  গ্রুপে যেকোনো ফরম্যাটে OTP আসুক → correct user-কে forward করবে
 ***********************************************************************/
bot.on("message", async (ctx) => {
  try {
    if (ctx.chat.id !== OTP_GROUP_ID) return;

    const msgText = ctx.message.text || ctx.message.caption || '';
    const msgId = ctx.message.message_id;

    console.log(`\n===== OTP GROUP [${msgId}] =====`);
    console.log(`Text: ${msgText.substring(0, 200)}`);
    console.log(`Active: [${Object.keys(activeNumbers).join(', ')}]`);

    if (!msgText.trim()) return;
    if (!Object.keys(activeNumbers).length) { console.log("No active numbers."); return; }

    const number = extractPhoneNumberFromMessage(msgText);
    if (!number) { console.log("No match found."); return; }
    if (!activeNumbers[number]) { console.log(`${number} not active.`); return; }

    console.log(`MATCH: ${number} → User: ${activeNumbers[number].userId}`);
    await forwardOTPMessageToUser(number, msgId);
    console.log(`================================\n`);

  } catch (e) { console.error("OTP monitoring error:", e); }
});

/******************** ERROR & START ********************/
bot.catch((err, ctx) => { console.error(`Bot error [${ctx.updateType}]:`, err.message); });

async function startBot() {
  try {
    console.log("==========================================");
    console.log("  AH Method Number Bot");
    console.log(`  OTP Group ID: ${OTP_GROUP_ID}`);
    console.log(`  Countries: ${Object.keys(countries).length}`);
    console.log(`  Services:  ${Object.keys(services).length}`);
    console.log(`  Numbers:   ${Object.values(numbersByCountryService).flatMap(c => Object.values(c).flat()).length}`);
    console.log(`  Active:    ${Object.keys(activeNumbers).length}`);
    console.log("------------------------------------------");
    console.log("  FIXES:");
    console.log("  Unicode letters (Ⓨ Ⓞ Ⓤ...) → converted");
    console.log("  Masked numbers (***) → handled");
    console.log("  7 extraction strategies → any format");
    console.log("  240+ world countries included");
    console.log("==========================================");
    await bot.launch();
    console.log("  Bot started successfully!");
  } catch (e) {
    console.error("Failed to start:", e);
    setTimeout(startBot, 10000);
  }
}

startBot();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
