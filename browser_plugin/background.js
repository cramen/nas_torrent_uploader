const DEFAULT_DIRS_URL = 'http://tnas.local:3300/api/dirs';
const DEFAULT_UPLOAD_URL = 'http://tnas.local:3300/api/upload';
const DEFAULT_QBIT_URL = 'https://tnas.tnas.link:5443/qbittorrent/';
const DEFAULT_QBIT_PATH_MAP = 'video=/Volume2/video\nsoft=/Volume2/public/soft';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'fetchDirs') {
        chrome.storage.sync.get({
            dirsUrl: DEFAULT_DIRS_URL,
            token: ''
        }, function(settings) {
            const dirsUrlWithToken = `${settings.dirsUrl}?token=${encodeURIComponent(settings.token)}`;
            console.log('Using dirs URL:', dirsUrlWithToken);
            
            fetch(dirsUrlWithToken)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch directories');
                    }
                    return response.json();
                })
                .then(data => sendResponse({ success: true, data }))
                .catch(error => sendResponse({ success: false, error: error.message }));
        });
        return true;
    } 
    else if (request.action === 'downloadTorrent') {
        fetch(request.torrentUrl, { credentials: 'include' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to download torrent file (HTTP ' + response.status + ')');
                }
                return response.arrayBuffer();
            })
            .then(data => {
                const bytes = new Uint8Array(data);
                // Торрент-файл — это bencoded-словарь, он начинается с 'd'.
                // Если пришёл HTML — значит трекер вернул страницу логина/ошибки.
                if (bytes.length === 0 || bytes[0] !== 0x64) {
                    throw new Error('Трекер не отдал torrent-файл. Проверьте, что вы залогинены на сайте.');
                }
                return sendResponse({ success: true, data: Array.from(bytes) });
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } 
    else if (request.action === 'addToQbittorrent') {
        chrome.storage.sync.get({
            qbitEnabled: false,
            qbitUrl: DEFAULT_QBIT_URL,
            qbitUser: '',
            qbitPassword: '',
            qbitPathMap: DEFAULT_QBIT_PATH_MAP
        }, async function(settings) {
            if (!settings.qbitEnabled) {
                sendResponse({ success: true, skipped: true });
                return;
            }
            try {
                const baseUrl = settings.qbitUrl.replace(/\/+$/, '') + '/';

                // Авторизация: SID-cookie сохранится в браузерном хранилище кук
                const loginBody = new URLSearchParams({
                    username: settings.qbitUser,
                    password: settings.qbitPassword
                });
                const loginResp = await fetch(baseUrl + 'api/v2/auth/login', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: loginBody.toString()
                });
                const loginText = await loginResp.text();
                if (!loginResp.ok || loginText.trim() !== 'Ok.') {
                    throw new Error('Ошибка авторизации в qBittorrent: ' +
                        (loginText.trim() === 'Fails.' ? 'неверный логин или пароль' : loginText.trim() || 'HTTP ' + loginResp.status));
                }

                // Добавление торрента
                const torrentBlob = new Blob([new Uint8Array(request.torrentData)],
                                             { type: 'application/x-bittorrent' });
                const formData = new FormData();
                formData.append('torrents', torrentBlob, request.filename);
                // Маппинг директории сервера (например "video/movies") в реальный путь
                // на NAS по таблице вида "video=/Volume2/video". Если соответствия нет —
                // savepath не передаём, qBittorrent возьмёт путь по умолчанию.
                const pathMap = {};
                (settings.qbitPathMap || '').split('\n').forEach(line => {
                    const idx = line.indexOf('=');
                    if (idx > 0) {
                        pathMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/\/+$/, '');
                    }
                });
                const dirParts = request.directory.split('/');
                if (pathMap[dirParts[0]]) {
                    formData.append('savepath', [pathMap[dirParts[0]], ...dirParts.slice(1)].join('/'));
                }

                const addResp = await fetch(baseUrl + 'api/v2/torrents/add', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                const addText = await addResp.text();
                if (!addResp.ok || addText.trim() !== 'Ok.') {
                    throw new Error('qBittorrent не принял торрент: ' + (addText.trim() || 'HTTP ' + addResp.status));
                }

                sendResponse({ success: true });
            } catch (error) {
                // TypeError: Failed to fetch — сетевая ошибка: недоступный хост,
                // неверный URL или непринятый самоподписанный сертификат
                const msg = error.message === 'Failed to fetch'
                    ? `Не удалось подключиться к qBittorrent (Failed to fetch). Проверьте URL и откройте ${settings.qbitUrl} в браузере, чтобы принять сертификат.`
                    : error.message;
                sendResponse({ success: false, error: msg });
            }
        });
        return true;
    }
    else if (request.action === 'uploadTorrent') {
        chrome.storage.sync.get({
            uploadUrl: DEFAULT_UPLOAD_URL,
            token: ''
        }, function(settings) {
            const uploadUrlWithToken = `${settings.uploadUrl}?token=${encodeURIComponent(settings.token)}`;
            console.log('Using upload URL:', uploadUrlWithToken);
            
            console.log('Uploading torrent:', {
                filename: request.filename,
                directory: request.directory,
                dataLength: request.torrentData.length
            });
            
            const torrentBlob = new Blob([new Uint8Array(request.torrentData)], 
                                       { type: 'application/x-bittorrent' });
            const torrentFile = new File([torrentBlob], request.filename, 
                                       { type: 'application/x-bittorrent' });
            
            const formData = new FormData();
            formData.append('directory', request.directory);
            formData.append('torrent', torrentFile);
            
            console.log("FormData contents:");
            for (let [key, value] of formData.entries()) {
                console.log(`- ${key}: ${value instanceof File ? value.name : value}`);
            }
            
            fetch(uploadUrlWithToken, {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    console.log('Upload response status:', response.status);
                    return response.text().then(text => {
                        console.log('Response text:', text);
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            throw new Error('Invalid server response: ' + text);
                        }
                    });
                })
                .then(data => {
                    console.log('Upload success:', data);
                    sendResponse({ success: true, data });
                })
                .catch(error => {
                    console.error('Upload error:', error);
                    sendResponse({ success: false, error: error.message });
                });
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.get({
        dirsUrl: null,
        uploadUrl: null,
        token: null
    }, function(items) {
        const updates = {};
        if (items.dirsUrl === null) updates.dirsUrl = DEFAULT_DIRS_URL;
        if (items.uploadUrl === null) updates.uploadUrl = DEFAULT_UPLOAD_URL;
        if (items.token === null) updates.token = '';
        if (Object.keys(updates).length > 0) {
            chrome.storage.sync.set(updates);
        }
    });
});

console.log('Background script loaded');