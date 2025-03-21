const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;

// Директория с целевыми папками
const TARGETS_DIR = '/targets';

// Проверка существования директории
if (!fs.existsSync(TARGETS_DIR)) {
    fs.mkdirSync(TARGETS_DIR, { recursive: true });
    console.log(`Created directory ${TARGETS_DIR}`);
}

// Добавляем CORS для работы с расширением
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ⚠️ ВАЖНОЕ ИЗМЕНЕНИЕ: обработка multipart/form-data до multer
// Мы НЕ используем эти middleware для multipart/form-data, так как multer сам их обрабатывает
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Создаем функцию логирования для отладки запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // ⚠️ ВАЖНОЕ ИЗМЕНЕНИЕ: Получаем directory из поля формы
        console.log('Multer req.body:', req.body);
        const directory = req.body.directory;
        
        console.log('Attempting to upload to directory:', directory);
        
        if (!directory) {
            return cb(new Error('Directory parameter is missing'));
        }
        
        // Проверим, что директория существует
        const targetDir = path.join(TARGETS_DIR, directory);
        console.log('Full target path:', targetDir);
        
        if (!fs.existsSync(targetDir)) {
            return cb(new Error(`Target directory "${directory}" does not exist`));
        }
        
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        console.log('File info:', file);
        cb(null, file.originalname);
    }
});

// Фильтр файлов - только .torrent
const fileFilter = (req, file, cb) => {
    console.log('Filtering file:', file.originalname);
    if (path.extname(file.originalname).toLowerCase() === '.torrent') {
        cb(null, true);
    } else {
        cb(new Error('Only .torrent files are allowed!'), false);
    }
};

// ⚠️ ВАЖНОЕ ИЗМЕНЕНИЕ: Настраиваем multer для обработки полей формы
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter 
}).single('torrent');

// Эндпоинт 1: Список поддиректорий
app.get('/api/dirs', (req, res) => {
    try {
        const items = fs.readdirSync(TARGETS_DIR, { withFileTypes: true });
        const dirs = items
            .filter(item => item.isDirectory())
            .map(dir => ({ name: dir.name }));
        
        res.json(dirs);
    } catch (error) {
        console.error('Error reading directories:', error);
        res.status(500).json({ error: 'Failed to read directories' });
    }
});

// ⚠️ ВАЖНОЕ ИЗМЕНЕНИЕ: Эндпоинт 2: Загрузка торрент-файла с обработкой ошибок
app.post('/api/upload', (req, res) => {
    upload(req, res, function(err) {
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

// Для отладки: эндпоинт, который просто возвращает полученные данные
app.post('/api/test-upload', (req, res) => {
    console.log('Test upload body:', req.body);
    res.json({ 
        received: true,
        body: req.body
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
