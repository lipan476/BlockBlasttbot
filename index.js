require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors'); // 新增

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 读取环境变量
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL; // 改用WEB_APP_URL更符合语义

console.log("🔍 服务器启动时读取的环境变量：");
console.log("BOT_TOKEN:", BOT_TOKEN ? "已加载 ✅" : "未定义 ❌");
console.log("WEB_APP_URL:", WEB_APP_URL);

if (!BOT_TOKEN) {
    console.error("❌ 错误: BOT_TOKEN 未定义，请检查环境变量！");
    process.exit(1);
}


// 允许来自指定域的请求（替换为你的前端域名）
const allowedOrigins = [
    'https://lipan476.github.io',
    'https://block-blasttbot.vercel.app' // 你的 Telegram Web App 域名
];


app.use(express.json());

// app.use(cors({
//   origin: function (origin, callback) {
//     // 允许没有 origin 的请求（如 Telegram Web App 或本地测试）
//     if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
//   preflightContinue: false,
//   optionsSuccessStatus: 204
// }));

// // 显式处理 OPTIONS 请求
// app.options('*', cors());


//

//


app.use(cors({
  origin: 'https://lipan476.github.io',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// 显式处理 OPTIONS 请求
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://lipan476.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
});



app.post('/submit-score', async (req, res) => {
  // 设置 CORS 头
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  const { user_id, score, inline_message_id } = req.body;

  if (!user_id || !score || !inline_message_id) {
    console.error("❌ 参数不完整");
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setGameScore`, {
      user_id,
      score,
      inline_message_id
    });
    console.log("✅ 成功上传分数:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("❌ 上传分数失败:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to upload score" });
  }
});

// ✅ 玩家查看排行榜
app.post('/get-leaderboard', async (req, res) => {
    const { user_id, inline_message_id } = req.body;

    if (!user_id || !inline_message_id) {
        console.error("❌ 参数不完整");
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/getGameHighScores`, {
            user_id,
            inline_message_id
        });
        console.log("✅ 获取排行榜数据:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("❌ 获取排行榜失败:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to get highscores" });
    }
});




// ✅ 处理 Telegram Webhook
app.post('/webhook', async (req, res) => {
    console.log("📩 收到 Telegram 消息:", JSON.stringify(req.body, null, 2));

    if (!req.body || !req.body.message || !req.body.message.text) {
        console.error("❌ 错误: 收到的请求格式不正确");
        return res.sendStatus(400);
    }

    const message = req.body.message;
    const chatId = message.chat.id;

    //if (message.text === '/start') {
    if (message.text.startsWith('/start')) {
        //start tapps_App_Screen，/start tapps_New， /start tapps_recent
        
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

        console.log(`🛠️ 正在向 Telegram 发送消息: ${url}`);

        try {
            const response = await axios.post(url, {
                chat_id: chatId,
                text: '🎮 Welcome to Block Blast Game! Click the button below to play:',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "Play Now 🎮",
                            web_app: { url: WEB_APP_URL } // 使用Web App方式打开
                        }]
                    ]
                }
            });

            console.log("✅ 发送成功:", response.data);
            res.sendStatus(200);
        } catch (error) {
            console.error("❌ 发送消息时出错:", error.response ? error.response.data : error.message);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(200);
    }
});

// ✅ 监听 `/`，避免 Vercel 404 错误
app.get('/', (req, res) => {
    res.send("🚀 Telegram Bot Server is running!");
});

// ✅ 启动服务器
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在端口 ${PORT}`);
});