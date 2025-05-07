require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://lipan476.github.io'
}));

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

app.use(express.json());

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
                text: '🎮 Welcome to Sudoku Game! Click the button below to play:',
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


// ✅ 玩家通关后上传分数
app.post('/submit-score', async (req, res) => {
    try {
        console.log('收到请求体:', req.body);
        
        const { user_id, score, inline_message_id, chat_id, message_id } = req.body;
        
        // 参数验证
        if (!user_id || typeof score !== 'number') {
            return res.status(400).json({ 
                error: "需要 user_id 和 score 参数",
                received: req.body 
            });
        }

        // 构建Telegram API请求体
        const payload = {
            user_id: Number(user_id),
            score: Math.floor(score),
            force: true
        };

        if (inline_message_id) {
            payload.inline_message_id = inline_message_id;
        } else if (chat_id && message_id) {
            payload.chat_id = chat_id;
            payload.message_id = message_id;
        } else {
            return res.status(400).json({ 
                error: "需要以下任一组合：",
                required_options: [
                    "inline_message_id",
                    "chat_id + message_id"
                ],
                received: req.body
            });
        }

        // 调用Telegram API
        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/setGameScore`,
            payload,
            { 
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            telegram_response: response.data
        });
        
    } catch (error) {
        console.error('服务器错误:', {
            error: error.response?.data || error.message,
            stack: error.stack,
            request: req.body
        });
        
        res.status(500).json({
            error: "服务器处理分数时出错",
            details: {
                telegram_error: error.response?.data,
                internal_error: error.message
            }
        });
    }
});


// ✅ 玩家查看排行榜
app.post('/get-leaderboard', async (req, res) => {
    const { user_id, chat_id } = req.body;

    if (!user_id || !chat_id) {
        console.error("❌ 参数不完整");
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/getGameHighScores`, {
            user_id,
            chat_id: chat_id || user_id // 默认私聊
        });
        console.log("✅ 获取排行榜数据:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("❌ 获取排行榜失败:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to get highscores" });
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