// Обработчик нажатия на ссылку настроек
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup DOM loaded');
  
  const settingsLink = document.getElementById('settingsLink');
  
  if (settingsLink) {
    console.log('Settings link found');
    
    settingsLink.addEventListener('click', function() {
      console.log('Settings link clicked');
      
      // Открываем страницу настроек
      chrome.runtime.openOptionsPage();
    });
  } else {
    console.error('Settings link not found!');
  }
});
