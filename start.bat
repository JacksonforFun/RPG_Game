@echo off
echo 🎭 Запуск Сказочника...

REM Проверяем, установлены ли зависимости сервера
if not exist "server\node_modules" (
    echo 📦 Установка зависимостей сервера...
    cd server
    call npm install
    cd ..
)

REM Запускаем сервер в новом окне
echo 🌐 Запуск сервера на порту 3001...
start "Skazochnik Server" cmd /k "cd server && npm start"

REM Ждём запуска сервера
timeout /t 3 /nobreak > nul

REM Запускаем клиент
echo 🎮 Запуск клиента...
npm run dev

echo 👋 Сказочник завершён
pause
