const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;

const TARGETS_DIR = '/targets';

if (!fs.existsSync(TARGETS_DIR)) {
    fs.mkdirSync(TARGETS_DIR, { recursive: true });
    console.log(`Created directory ${TARGETS_DIR}`);
}

// Добавляем middleware для проверки токена
app.use((req, res, next) => {
    const token = req.query.token;
    if (!token || token !== process.env.TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// Настройка CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Настройка multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Multer req.body:', req.body);
        const directory = req.body.directory;
        console.log('Attempting to upload to directory:', directory);
        if (!directory) {
            return cb(new Error('Directory parameter is missing'));
        }
        const targetDir = path.normalize(path.join(TARGETS_DIR, directory));
        if (!targetDir.startsWith(TARGETS_DIR)) {
            return cb(new Error('Invalid directory path'));
        }
        try {
            if (!fs.existsSync(targetDir)) {
                return cb(new Error(`Target directory "${directory}" does not exist`));
            }
            if (!fs.statSync(targetDir).isDirectory()) {
                return cb(new Error(`Target path "${directory}" is not a directory`));
            }
        } catch (error) {
            return cb(error);
        }
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        console.log('File info:', file);
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    console.log('Filtering file:', file.originalname);
    if (path.extname(file.originalname).toLowerCase() === '.torrent') {
        cb(null, true);
    } else {
        cb(new Error('Only .torrent files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
}).single('torrent');

// Эндпоинты
app.get('/api/dirs', (req, res) => {
    try {
        const targets = fs.readdirSync(TARGETS_DIR, { withFileTypes: true })
            .filter(item => item.isDirectory())
            .map(dir => dir.name);
        const dirs = [];
        for (const target of targets) {
            const subDirs = fs.readdirSync(path.join(TARGETS_DIR, target), { withFileTypes: true })
                .filter(item => item.isDirectory())
                .map(subDir => ({ name: path.join(target, subDir.name) }));
            dirs.push(...subDirs);
        }
        res.json(dirs);
    } catch (error) {
        console.error('Error reading directories:', error);
        res.status(500).json({ error: 'Failed to read directories' });
    }
});

app.post('/api/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded or invalid file type' });
        }
        if (!req.body.directory) {
            return res.status(400).json({ error: 'Directory parameter is required' });
        }
        console.log('File uploaded successfully:', {
            filename: req.file.originalname,
            directory: req.body.directory,
            path: req.file.path
        });
        res.json({
            message: 'File uploaded successfully',
            filename: req.file.originalname,
            directory: req.body.directory
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});