#!/usr/bin/env node

/**
 * Скрипт для запуска Vite dev server с ngrok туннелем
 * 
 * Использование:
 * 1. Убедитесь, что ngrok установлен: npm install -g ngrok
 * 2. Настройте ngrok.yml в корне проекта
 * 3. Запустите: npm run dev:ngrok
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const NGROK_CONFIG_PATH = path.join(__dirname, 'ngrok.yml');

// Проверяем наличие ngrok
function checkNgrok() {
    return new Promise((resolve, reject) => {
        const ngrok = spawn('ngrok', ['version'], { stdio: 'pipe' });
        let output = '';
        
        ngrok.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ngrok.stderr.on('data', (data) => {
            output += data.toString();
        });
        
        ngrok.on('close', (code) => {
            if (code === 0 || output.includes('ngrok')) {
                resolve(true);
            } else {
                reject(new Error('ngrok не найден. Установите: npm install -g ngrok'));
            }
        });
    });
}

// Запускаем ngrok
function startNgrok() {
    console.log('🚀 Запуск ngrok...');
    
    // Используем прямую команду http с конфигурационным файлом
    const ngrok = spawn('ngrok', ['http', '--config', NGROK_CONFIG_PATH, '3000'], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let ngrokOutput = '';
    
    ngrok.stdout.on('data', (data) => {
        const text = data.toString();
        ngrokOutput += text;
        process.stdout.write(text);
    });
    
    ngrok.stderr.on('data', (data) => {
        const text = data.toString();
        ngrokOutput += text;
        process.stderr.write(text);
    });
    
    return { process: ngrok, output: () => ngrokOutput };
}

// Получаем URL из ngrok API
async function getNgrokUrl() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    const tunnels = response.tunnels;
                    
                    if (tunnels && tunnels.length > 0) {
                        const httpsTunnel = tunnels.find(t => t.proto === 'https');
                        if (httpsTunnel) {
                            resolve(httpsTunnel.public_url);
                            return;
                        }
                        resolve(tunnels[0].public_url);
                        return;
                    }
                    resolve(null);
                } catch (error) {
                    resolve(null);
                }
            });
        });
        
        req.on('error', () => {
            resolve(null);
        });
        
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(null);
        });
    });
}

// Запускаем Vite dev server
function startVite() {
    console.log('⚡ Запуск Vite dev server...');
    
    const vite = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
    });
    
    vite.on('close', (code) => {
        console.log(`\n⏹️  Vite завершил работу с кодом ${code}`);
    });
    
    return vite;
}

// Основная функция
async function main() {
    console.log('📦 Настройка ngrok для локальной разработки\n');
    
    // Проверяем ngrok
    try {
        await checkNgrok();
        console.log('✅ ngrok установлен\n');
    } catch (error) {
        console.error(`❌ ${error.message}`);
        process.exit(1);
    }
    
    // Проверяем конфигурацию
    if (!fs.existsSync(NGROK_CONFIG_PATH)) {
        console.error(`❌ Файл ngrok.yml не найден: ${NGROK_CONFIG_PATH}`);
        process.exit(1);
    }
    
    const configContent = fs.readFileSync(NGROK_CONFIG_PATH, 'utf8');
    
    // Проверяем, что токен настроен (ищем строку authtoken: с токеном, а не плейсхолдером)
    const authtokenMatch = configContent.match(/^authtoken:\s*(.+)$/m);
    if (!authtokenMatch || authtokenMatch[1].trim() === 'YOUR_NGROK_AUTH_TOKEN' || authtokenMatch[1].trim().length < 10) {
        console.error('❌ Необходимо настроить ngrok токен в ngrok.yml');
        console.error('   Получите токен на: https://dashboard.ngrok.com/get-started/your-authtoken');
        console.error('   Замените YOUR_NGROK_AUTH_TOKEN на ваш токен в строке authtoken:');
        process.exit(1);
    }
    
    // Запускаем ngrok
    const { process: ngrokProcess } = startNgrok();
    
    // Ждем запуска ngrok и получаем URL
    console.log('\n⏳ Ожидание запуска ngrok...');
    
    let ngrokUrl = null;
    for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        ngrokUrl = await getNgrokUrl();
        if (ngrokUrl) {
            console.log(`\n✅ Ngrok туннель создан: ${ngrokUrl}\n`);
            break;
        }
    }
    
    if (!ngrokUrl) {
        console.error('❌ Не удалось получить URL от ngrok');
        ngrokProcess.kill();
        process.exit(1);
    }
    
    console.log('📝 Важно:');
    console.log('   1. Используйте этот URL для тестирования Mini App в Telegram:');
    console.log(`      ${ngrokUrl}`);
    console.log('   2. Обновите WEB_APP_URL в BotFather:');
    console.log(`      /setmenubutton → выберите бота → Web App URL: ${ngrokUrl}`);
    console.log('   3. Для остановки нажмите Ctrl+C\n');
    
    // Запускаем Vite
    const viteProcess = startVite();
    
    // Обработка завершения
    process.on('SIGINT', () => {
        console.log('\n\n⏹️  Остановка...');
        viteProcess.kill();
        ngrokProcess.kill();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        viteProcess.kill();
        ngrokProcess.kill();
        process.exit(0);
    });
}

// Запуск
main().catch(error => {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
});

