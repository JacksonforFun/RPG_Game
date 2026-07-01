# 🌐 Настройка ngrok для мультиплеера из разных городов

## Что такое ngrok?

ngrok создаёт безопасный туннель от интернета к вашему локальному серверу.
Это позволяет игрокам подключаться к вашей игре из любой точки мира.

## Шаг 1: Установка ngrok

### Windows
```powershell
# Через Chocolatey
choco install ngrok

# Или скачайте с https://ngrok.com/download
```

### macOS
```bash
brew install ngrok
```

### Linux
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok
```

## Шаг 2: Регистрация и авторизация

1. Зарегистрируйтесь на [ngrok.com](https://ngrok.com) (бесплатно)
2. Скопируйте ваш Authtoken из [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Добавьте токен:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

## Шаг 3: Запуск туннеля

```bash
# Запустите сервер Сказочника
cd server
npm start

# В ДРУГОМ терминале запустите ngrok
ngrok http 3001
```

Вы увидите что-то вроде:
```
Session Status    online
Forwarding        https://a1b2-123-45-67-89.ngrok-free.app -> http://localhost:3001
```

## Шаг 4: Настройка игры

1. Скопируйте HTTPS URL (например `https://a1b2-123-45-67-89.ngrok-free.app`)
2. Откройте игру в браузере
3. Нажмите ⚙️ (настройки)
4. В поле «Сервер» вставьте URL
5. Нажмите «Подключиться»
6. Создайте комнату

## Шаг 5: Подключение игроков

Отправьте игрокам:
1. URL ngrok (например `https://a1b2-123-45-67-89.ngrok-free.app`)
2. Код комнаты (например `AB12`)

Игроки должны:
1. Открыть URL в браузере телефона
2. Выбрать «Телефон игрока»
3. Ввести код комнаты
4. Создать персонажа

## ⚠️ Важно

- **Бесплатный ngrok** имеет ограничения (1 туннель, 40 подключений/минуту)
- URL меняется при каждом перезапуске ngrok
- При первом подключении ngrok показывает страницу предупреждения — нажмите «Visit Site»

## 🔧 Альтернативы ngrok

### Cloudflare Tunnel (бесплатно, без ограничений)
```bash
# Установка
brew install cloudflared  # macOS
# или скачайте с https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Запуск
cloudflared tunnel --url http://localhost:3001
```

### localtunnel (бесплатно)
```bash
npm install -g localtunnel
lt --port 3001
```

### Tailscale (для своей сети)
Если все игроки готовы установить Tailscale — это лучший вариант.
Создаёт приватную сеть, и ваш сервер доступен по стабильному IP.

## 🎮 Готово!

Теперь игроки из любого города могут присоединиться к вашей игре!

```
Хост-ПК (Сервер)          Интернет              Телефоны игроков
     │                       │                        │
     │   localhost:3001      │                        │
     │ ◄──────────────────── │                        │
     │                       │                        │
     │        ngrok          │                        │
     │ ────────────────────► │ ◄───────────────────── │
     │                       │   https://xxx.ngrok.io │
     │                       │                        │
```
