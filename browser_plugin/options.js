const DEFAULT_DIRS_URL = 'http://tnas.local:3300/api/dirs';
const DEFAULT_UPLOAD_URL = 'http://tnas.local:3300/api/upload';
const DEFAULT_TOKEN = ''; // Токен по умолчанию пустой
const DEFAULT_QBIT_ENABLED = false;
const DEFAULT_QBIT_URL = 'https://tnas.tnas.link:5443/qbittorrent/';
const DEFAULT_QBIT_USER = '';
const DEFAULT_QBIT_PASSWORD = '';
const DEFAULT_QBIT_PATH_MAP = 'video=/Volume2/video\nsoft=/Volume2/public/soft';

const dirsUrlInput = document.getElementById('dirsUrl');
const uploadUrlInput = document.getElementById('uploadUrl');
const tokenInput = document.getElementById('token');
const qbitEnabledInput = document.getElementById('qbitEnabled');
const qbitUrlInput = document.getElementById('qbitUrl');
const qbitUserInput = document.getElementById('qbitUser');
const qbitPasswordInput = document.getElementById('qbitPassword');
const qbitPathMapInput = document.getElementById('qbitPathMap');
const saveButton = document.getElementById('saveBtn');
const resetButton = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

function loadOptions() {
    chrome.storage.sync.get({
        dirsUrl: DEFAULT_DIRS_URL,
        uploadUrl: DEFAULT_UPLOAD_URL,
        token: DEFAULT_TOKEN,
        qbitEnabled: DEFAULT_QBIT_ENABLED,
        qbitUrl: DEFAULT_QBIT_URL,
        qbitUser: DEFAULT_QBIT_USER,
        qbitPassword: DEFAULT_QBIT_PASSWORD,
        qbitPathMap: DEFAULT_QBIT_PATH_MAP
    }, function(items) {
        dirsUrlInput.value = items.dirsUrl;
        uploadUrlInput.value = items.uploadUrl;
        tokenInput.value = items.token;
        qbitEnabledInput.checked = items.qbitEnabled;
        qbitUrlInput.value = items.qbitUrl;
        qbitUserInput.value = items.qbitUser;
        qbitPasswordInput.value = items.qbitPassword;
        qbitPathMapInput.value = items.qbitPathMap;
    });
}

function saveOptions() {
    const dirsUrl = dirsUrlInput.value.trim() || DEFAULT_DIRS_URL;
    const uploadUrl = uploadUrlInput.value.trim() || DEFAULT_UPLOAD_URL;
    const token = tokenInput.value.trim() || DEFAULT_TOKEN;
    const qbitEnabled = qbitEnabledInput.checked;
    const qbitUrl = qbitUrlInput.value.trim() || DEFAULT_QBIT_URL;
    const qbitUser = qbitUserInput.value.trim();
    const qbitPassword = qbitPasswordInput.value;
    const qbitPathMap = qbitPathMapInput.value.trim();

    chrome.storage.sync.set({
        dirsUrl: dirsUrl,
        uploadUrl: uploadUrl,
        token: token,
        qbitEnabled: qbitEnabled,
        qbitUrl: qbitUrl,
        qbitUser: qbitUser,
        qbitPassword: qbitPassword,
        qbitPathMap: qbitPathMap
    }, function() {
        showStatus('Настройки сохранены!', 'success');
    });
}

function resetOptions() {
    dirsUrlInput.value = DEFAULT_DIRS_URL;
    uploadUrlInput.value = DEFAULT_UPLOAD_URL;
    tokenInput.value = DEFAULT_TOKEN;
    qbitEnabledInput.checked = DEFAULT_QBIT_ENABLED;
    qbitUrlInput.value = DEFAULT_QBIT_URL;
    qbitUserInput.value = DEFAULT_QBIT_USER;
    qbitPasswordInput.value = DEFAULT_QBIT_PASSWORD;
    qbitPathMapInput.value = DEFAULT_QBIT_PATH_MAP;
    saveOptions();
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    setTimeout(function() {
        statusDiv.className = 'status';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', loadOptions);
saveButton.addEventListener('click', saveOptions);
resetButton.addEventListener('click', resetOptions);
