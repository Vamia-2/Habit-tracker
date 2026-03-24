# 🚀 Habit Tracker - Повна Інструкція Розгортання

## 📋 Що було реалізовано

### ✅ 1. Структура Проекту
- **Frontend (React + Vite)**: `client/` - Реактивний інтерфейс з 3 темами
- **Backend (Node.js + Express)**: `server/` - API сервер з Socket.io
- **Database (MongoDB)**: Готова до підключення MongoDB Atlas

### ✅ 2. Функціонал

#### 🔐 Автентифікація
- ✅ Pages: `/login` та `/register`
- ✅ Хешування паролів (bcryptjs)
- ✅ JWT токени для безпеки
- ✅ Валідація даних

#### 🎨 Теми
- ✅ **Dark** (темна)
- ✅ **Light** (світла)
- ✅ **Blue** (переливаюча фіолетова/блакитна)
- ✅ Переключення в реальному часі

#### 📱 Dashboard - Звички
- ✅ Додавання звичок з датою та часом
- ✅ Чекбокс "Нагадування" (🔔)
- ✅ Карточки звичок зі **змінюючимся кольорами** залежно від близькості до дати:
  - Червоний (#e74c3c) - вже пройшла
  - Помаранчевий (#f39c12) - завтра
  - Жовтий (#f1c40f) - за 2-3 дні
  - Зелений (#2ecc71) - за тиждень
  - Синій (#3498db) - далеко
- ✅ Відмітка виконання/невиконання
- ✅ Видалення звичок
- ✅ Сортування по датам

#### 💬 Chat система
- ✅ Реал-тайм чат через Socket.io
- ✅ Список користувачів
- ✅ Історія повідомлень
- ✅ Показ часу доставки
- ✅ Responsive дизайн

#### 👑 Admin Panel (`/admin`)
- ✅ Список всіх користувачів
- ✅ Блокування користувачів (вибір днів)
- ✅ Розблокування
- ✅ Перегляд та обробка скарг
- ✅ Статистика платформи:
  - Кількість користувачів
  - Кількість заблокованих
  - Очікуючі скарги
  - Адміністратори

#### 📋 Система Скарг
- ✅ Користувачі можуть подати скаргу на іншого користувача
- ✅ Адміни бачать всі скарги
- ✅ Можливість одобрити скаргу (заблокувати користувача) або відхилити
- ✅ Автоматичне блокування на вказану кількість днів

#### 🎯 Додатково
- ✅ Профіль користувача з ім'ям та аватаром
- ✅ Система Follow/Unfollow для соціальних функцій
- ✅ Система достижень (підготовлено в моделі)
- ✅ Красивий, сучасний UI з анімаціями
- ✅ Responsive дизайн (мобільні пристрої)

---

## 🔧 Локальне налаштування

### Крок 1: Клонування репозиторію
```bash
cd c:\Users\Виталий\Desktop\Шаг\Node.JS\Habit-tracker
```

### Крок 2: Встановлення залежностей
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### Крок 3: Налаштування `.env` файлу

Створіть файл `.env` в кореневій директорії:
```
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/habit-tracker?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-12345678
PORT=5000
```

### Крок 4: Запуск локально

**Terminal 1 - Сервер:**
```bash
cd server
npm run dev
```
Сервер буде на `http://localhost:5000`

**Terminal 2 - Клієнт (desenvolvimento):**
```bash
cd client
npm run dev
```
Клієнт буде на `http://localhost:5173`

---

## 🌐 MongoDB Atlas Налаштування

### Крок 1: Створення облікового запису
1. Перейти на [mongodb.com](https://www.mongodb.com)
2. Натиснути "Sign Up"
3. Заповнити форму реєстрації

### Крок 2: Створення кластеру
1. У Dashboard натиснути "Create" → "New Project"
2. Назвати проект "Habit-Tracker"
3. Натиснути "Create Project"
4. Натиснути "Build a Database"
5. Обрати **M0 Free Tier** (безплатний)
6. Виконати решту кроків

### Крок 3: Отримання зв'язку (Connection String)
1. Натиснути "Databases" → выбрать ваш кластер
2. Натиснути "Connect"
3. Обрати "Drivers" → "Node.js"
4. Скопіювати connection string:
   ```
   mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/habit-tracker
   ```
5. Замінити `YOUR_USERNAME` та `YOUR_PASSWORD`
6. Поставити це в `.env` файл як `MONGO_URI`

### Крок 4: Дозвіл IP
1. Na MongoDB Atlas натиснути "Network Access"
2. Натиснути "Add IP Address"
3. Вибрати "Allow access from anywhere" (0.0.0.0/0) або додати конкретний IP
4. Підтвердити

---

## 🚀 Розгортання на Render

### Крок 1: Підготовка Git репозиторію
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### Крок 2: Створення акаунту на Render
1. Перейти на [render.com](https://render.com)
2. Натиснути "Sign up" → виібрати GitHub
3. Авторизуватися через GitHub

### Крок 3: Розгортання
1. На Render натиснути "New+" → "Web Service"
2. Вибрати ваш GitHub репозиторій
3. Заповнити властивості:
   - **Name**: `habit-tracker`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Додати Environment Variables:
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   PORT=5000
   ```
5. Натиснути "Create Web Service"

### Крок 4: Перевірка розгортання
- Render автоматично буде розгортати при кожному push
- Посилання на ваш сайт буде виглядати як: `https://habit-tracker.onrender.com`

---

## 📝 Порядок сторінок

```
Login/Register
    ↓
Dashboard (My Habits)
    ├→ Chat
    └→ Admin Panel (тільки для адмінів)
```

---

## 🔐 Тестові дані

Для локального тестування можна мручно відповівідати адміна в MongoDB:

```javascript
// Вставити в MongoDB через Compass або Atlas UI
{
  email: "admin@test.com",
  password: "hashed_password",
  username: "Admin",
  role: "admin"
}
```

---

## 📊 API Endpoints

### Auth
- `POST /api/register` - Реєстрація
- `POST /api/login` - Вхід

### Habits
- `GET /api/habits` - Отримати звички користувача
- `POST /api/habits` - Додати звичку
- `PUT /api/habits/:id` - Оновити звичку
- `DELETE /api/habits/:id` - Видалити звичку

### Chat
- `GET /api/messages/:userId` - Отримати повідомлення
- Socket.io: 
  - `join` - приєднатися до чату
  - `sendMessage` - надіслати повідомлення
  - `newMessage` - отримати нове повідомлення

### Admin
- `GET /admin/users` - Список користувачів
- `POST /admin/block/:userId` - Заблокувати користувача
- `POST /admin/unblock/:userId` - Розблокувати користувача
- `GET /complaints` - Список скарг
- `POST /complaint` - Подати скаргу
- `PUT /complaint/:id` - Обробити скаргу

---

## 🎨 Технік стек

### Frontend
- React 19
- Vite (rolldown)
- Socket.io Client
- Axios
- React Router v7

### Backend
- Express.js
- Node.js
- MongoDB (Mongoose)
- Socket.io
- bcryptjs
- JWT

### Hosting
- Render (Backend + Frontend)
- MongoDB Atlas (Database)

---

## 📱 Responsive Design
✅ Налаштовано для:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

---

## 🐛 Можливі Проблеми

### 1. "Cannot GET /"
- **Проблема**: Клієнт не зібраний
- **Рішення**: `npm run build` в корені проекту

### 2. "Cannot connect to MongoDB"
- **Проблема**: Невісний MONGO_URI або IP не додано
- **Рішення**: Перевірити .env та дозволи в MongoDB Atlas

### 3. "Socket.io connection failed"
- **Проблема**: Порт не відкритий або сервер не запущений
- **Рішення**: Переконатися, що сервер запущений на PORT 5000

### 4. CORS помилки
- **Проблема**: Frontend та Backend на різних портах
- **Рішення**: CORS налаштовано на `*`, повинно працювати

---

## 📞 Контакти

Для будь-яких питань звертайтеся до розробника.

---

**Дата створення**: 2026-03-24
**Версія**: 1.0.0
**Статус**: ✅ Готово до розгортання
