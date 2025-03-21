// Функция для создания кнопки загрузки
function addUploadButtons() {
  // Массив селекторов для различных торрент-сайтов
  const selectors = [
    // Rutracker селекторы
    {
      selector: 'a[href] img[src*="attach_big.gif"]',
      type: 'elementInLink'  // Элемент внутри ссылки
    },

    // NNMClub селекторы
    {
      selector: 'a[href] img[src*="pdltor.gif"]',
      type: 'elementInLink'  // Элемент внутри ссылки
    },
    {
      selector: 'a[href*="download.php"]',
      type: 'directLink'     // Прямая ссылка
    },

    // Можно легко добавить другие селекторы для других сайтов
    // { selector: 'выражение', type: 'тип' },
  ];

  // Обрабатываем все селекторы
  selectors.forEach(selectorObj => {
    const elements = document.querySelectorAll(selectorObj.selector);

    elements.forEach(element => {
      let link;

      // Определяем ссылку в зависимости от типа селектора
      if (selectorObj.type === 'elementInLink') {
        link = element.closest('a');
      } else if (selectorObj.type === 'directLink') {
        link = element;
      }

      if (link && link.href) {
        processLink(link);
      }
    });
  });

  function processLink(link) {
    if (!link.nextElementSibling?.classList?.contains('upload-to-nas-btn')) {
      const uploadButton = document.createElement('button');
      uploadButton.textContent = 'Загрузить на NAS';
      uploadButton.className = 'upload-to-nas-btn';
      uploadButton.style.cssText = `
        margin-left: 10px;
        padding: 5px 10px;
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      uploadButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleTorrentUpload(link.href);
      });
      link.parentNode.insertBefore(uploadButton, link.nextSibling);
    }
  }
}

// Функция для сохранения последней выбранной директории
function saveLastSelectedDirectory(directory) {
  chrome.storage.local.set({ lastSelectedDirectory: directory }, function() {
    console.log('Последняя выбранная директория сохранена:', directory);
  });
}

// Функция для получения последней выбранной директории
function getLastSelectedDirectory(callback) {
  chrome.storage.local.get(['lastSelectedDirectory'], function(result) {
    callback(result.lastSelectedDirectory || null);
  });
}

// Функция создания модального окна с выпадающим списком директорий
async function showDirectorySelector(directories) {
  return new Promise((resolve) => {
    // Получаем последнюю выбранную директорию
    getLastSelectedDirectory(function(lastSelected) {
      // Создаем затемнение фона
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      `;

      // Создаем модальное окно
      const modal = document.createElement('div');
      modal.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        width: 90%;
      `;

      // Заголовок
      const title = document.createElement('h3');
      title.textContent = 'Выберите директорию для загрузки';
      title.style.cssText = `
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 18px;
        color: #333;
      `;

      // Создаем выпадающий список
      const select = document.createElement('select');
      select.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 20px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        background-color: #f9f9f9;
      `;

      // Наполняем список директориями
      directories.forEach(dir => {
        const option = document.createElement('option');
        option.value = dir.name;
        option.textContent = dir.name;
        // Устанавливаем последнюю выбранную директорию как выбранную по умолчанию
        if (dir.name === lastSelected) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      // Контейнер для кнопок
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      `;

      // Кнопка отмены
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Отмена';
      cancelButton.style.cssText = `
        padding: 8px 16px;
        background-color: #f1f1f1;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;

      // Кнопка подтверждения
      const confirmButton = document.createElement('button');
      confirmButton.textContent = 'Загрузить';
      confirmButton.style.cssText = `
        padding: 8px 16px;
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;

      // Обработчики кнопок
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(null);
      });

      confirmButton.addEventListener('click', () => {
        const selectedDir = select.value;
        document.body.removeChild(overlay);
        resolve(selectedDir);
      });

      // Собираем все элементы вместе
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(confirmButton);

      modal.appendChild(title);
      modal.appendChild(select);
      modal.appendChild(buttonContainer);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  });
}

// Функция для обработки загрузки торрент-файла
async function handleTorrentUpload(torrentUrl) {
  try {
    // 1. Получаем список директорий через background script
    const dirsResult = await sendMessageToBackground({ action: 'fetchDirs' });

    if (!dirsResult.success) {
      throw new Error(`Не удалось получить список директорий: ${dirsResult.error}`);
    }

    const directories = dirsResult.data;
    if (!directories.length) {
      alert('Не найдено директорий для загрузки на сервере');
      return;
    }

    // 2. Показываем модальное окно с выпадающим списком
    const selectedDir = await showDirectorySelector(directories);

    if (!selectedDir) return; // Пользователь нажал "Отмена"

    // Показываем сообщение о скачивании
    const statusMsg = document.createElement('div');
    statusMsg.textContent = 'Загрузка торрент-файла...';
    statusMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #333; color: white; padding: 15px; border-radius: 5px; z-index: 9999;';
    document.body.appendChild(statusMsg);

    // 3. Скачиваем торрент-файл через background script
    const torrentResult = await sendMessageToBackground({ action: 'downloadTorrent', torrentUrl });

    if (!torrentResult.success) {
      throw new Error(`Не удалось скачать торрент-файл: ${torrentResult.error}`);
    }

    // Определяем имя файла
    let filename = 'download.torrent';
    const match = torrentUrl.match(/[?&](t|id)=(\d+)/);
    if (match && match[2]) {
      filename = `${match[2]}.torrent`;
    }

    statusMsg.textContent = 'Отправка на сервер...';

    // 4. Загружаем торрент-файл на сервер через background script
    const uploadResult = await sendMessageToBackground({
      action: 'uploadTorrent',
      torrentData: torrentResult.data,
      filename,
      directory: selectedDir
    });

    if (!uploadResult.success) {
      throw new Error(`Ошибка загрузки: ${uploadResult.error}`);
    }

    // Сохраняем выбранную директорию после успешной загрузки
    saveLastSelectedDirectory(selectedDir);

    statusMsg.textContent = `Торрент успешно загружен в "${selectedDir}"`;
    statusMsg.style.background = '#4CAF50';

    // Удаляем сообщение через 3 секунды
    setTimeout(() => {
      document.body.removeChild(statusMsg);
    }, 3000);

  } catch (error) {
    console.error('Ошибка:', error);
    alert(`Произошла ошибка: ${error.message}`);
  }
}

// Функция для отправки сообщений в background script
function sendMessageToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

// Запускаем добавление кнопок при загрузке страницы
addUploadButtons();

// Наблюдатель за изменениями в DOM для работы с динамическим контентом
const observer = new MutationObserver(() => {
  addUploadButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
