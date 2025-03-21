FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json ./
RUN npm install --production

# Копируем исходный код
COPY app.js ./

# Создаем директорию для монтирования
RUN mkdir -p /targets

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "app.js"]
