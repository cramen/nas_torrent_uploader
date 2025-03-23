// Значения по умолчанию
const DEFAULT_DIRS_URL = 'http://tnas.local:3300/api/dirs';
const DEFAULT_UPLOAD_URL = 'http://tnas.local:3300/api/upload';
const DEFAULT_TOKEN = ''; // Токен по умолчанию пустой

// Элементы интерфейса
const dirsUrlInput = document.getElementById('dirsUrl');
const uploadUrlInput = document.getElementById('uploadUrl');
const tokenInput = document.getElementById('token');
const saveButton = document.getElementById('saveBtn');
const resetButton = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Загрузка сохраненных настроек при открытии страницы
function loadOptions() {
  chrome.storage.sync.get({
    dirsUrl: DEFAULT_DIRS_URL,
    uploadUrl: DEFAULT_UPLOAD_URL
    token: DEFAULT_TOKEN
  }, function(items) {
    dirsUrlInput.value = items.dirsUrl;
    uploadUrlInput.value = items.uploadUrl;
    tokenInput.value = items.token;
  });
}

// Сохранение настроек
function saveOptions() {
  const dirsUrl = dirsUrlInput.value.trim() || DEFAULT_DIRS_URL;
  const uploadUrl = uploadUrlInput.value.trim() || DEFAULT_UPLOAD_URL;
    const token = tokenInput.value.trim() || DEFAULT_TOKEN;

  chrome.storage.sync.set({
    dirsUrl: dirsUrl,
    uploadUrl: uploadUrl,
    token: token
  }, function() {
    // Обновляем статус
    showStatus('Настройки сохранены!', 'success');
  });
}

// Сброс настроек к значениям по умолчанию
function resetOptions() {
  dirsUrlInput.value = DEFAULT_DIRS_URL;
  uploadUrlInput.value = DEFAULT_UPLOAD_URL;
  tokenInput.value = DEFAULT_TOKEN;
  saveOptions();
}

// Отображение статуса
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  
  setTimeout(function() {
    statusDiv.className = 'status';
  }, 3000);
}

// Привязка событий
document.addEventListener('DOMContentLoaded', loadOptions);
saveButton.addEventListener('click', saveOptions);
resetButton.addEventListener('click', resetOptions);
