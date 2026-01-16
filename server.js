const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 8000;
const DATA_FILE_PATH = path.join(__dirname, 'data.json');

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // 使用时间戳+原始文件名，避免冲突
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// 创建multer实例
const upload = multer({ 
    storage: storage,
    // 限制文件大小（5MB）
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    // 文件类型过滤
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'audio/mpeg', 'audio/wav', 'audio/mp3'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'), false);
        }
    }
});

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 允许跨域请求
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// 静态文件服务 - 先添加uploads目录的静态服务
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

// 单个文件上传API
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有文件被上传' });
        }
        
        // 返回文件URL
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, fileUrl: fileUrl });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ error: error.message || '文件上传失败' });
    }
});

// 获取数据 API
app.get('/api/data', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('读取数据文件失败:', error);
        res.status(500).json({ error: '读取数据失败' });
    }
});

// 保存数据 API
app.post('/api/data', (req, res) => {
    try {
        const newData = req.body;
        
        // 验证数据格式
        if (!newData.hometowns || !newData.banner || !newData.audioStory || !newData.products) {
            return res.status(400).json({ error: '数据格式不正确' });
        }
        
        // 写入文件
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(newData, null, 2), 'utf8');
        console.log('数据已成功保存到 data.json');
        res.json({ success: true, message: '数据保存成功' });
    } catch (error) {
        console.error('保存数据文件失败:', error);
        res.status(500).json({ error: '保存数据失败' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`前端页面访问地址: http://localhost:${PORT}`);
    console.log(`管理页面访问地址: http://localhost:${PORT}/admin.html`);
});
