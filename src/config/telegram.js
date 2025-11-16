import { BOT_CONFIG } from './bot.js';
import { navigationManager } from './navigation.js';

// Получаем TG динамически, так как SDK может загрузиться позже
export const getTG = () => window.Telegram?.WebApp;

// Для обратной совместимости экспортируем TG как геттер
export const TG = new Proxy({}, {
    get(target, prop) {
        const tg = getTG();
        return tg?.[prop];
    }
});

// Проверяем поддержку функций в текущей версии
const getFeaturesSupported = () => {
    const TG = getTG();
    return {
        haptic: TG?.version >= '6.1',
        backButton: TG?.version >= '6.1'
    };
};

/**
 * Ожидание загрузки Telegram WebApp SDK
 */
function waitForTelegramSDK() {
    return new Promise((resolve) => {
        // Если SDK уже загружен
        if (window.Telegram?.WebApp) {
            resolve();
            return;
        }

        // Ждем загрузки SDK (максимум 5 секунд)
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд
        
        const checkSDK = setInterval(() => {
            attempts++;
            if (window.Telegram?.WebApp || attempts >= maxAttempts) {
                clearInterval(checkSDK);
                resolve();
            }
        }, 100);
    });
}

export const initTelegram = async () => {
    // Ждем загрузки Telegram SDK
    await waitForTelegramSDK();
    
    const TG = getTG();
    if (!TG) {
        console.warn('⚠️ Telegram WebApp SDK не загружен. Приложение будет работать в режиме разработки.');
        return;
    }

    try {
        TG.ready();
        TG.expand();
        
        TG.enableClosingConfirmation();
        
        TG.onEvent('backButtonClicked', () => {
            if (!navigationManager.goBack()) {
                TG.close();
            }
        });
        
        TG.setHeaderColor('#000000');
        TG.setBackgroundColor('#000000');
        
        // Обрабатываем изменение навигации только если поддерживается BackButton
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.backButton) {
            window.addEventListener('navigation-changed', () => {
                if (navigationManager.canGoBack()) {
                    showBackButton();
                } else {
                    hideBackButton();
                }
            });
        }
        
        window.addEventListener('beforeunload', () => {
            TG.disableClosingConfirmation();
        });

        TG.onEvent('viewportChanged', () => {
            if (!TG.isExpanded) {
                TG.disableClosingConfirmation();
            }
        });

        console.log('✅ Telegram WebApp инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram:', error);
    }
};

export const showBackButton = () => {
    const TG = getTG();
    const FEATURES_SUPPORTED = getFeaturesSupported();
    if (FEATURES_SUPPORTED.backButton && TG?.BackButton) {
        TG.BackButton.show();
    }
};

export const hideBackButton = () => {
    const TG = getTG();
    const FEATURES_SUPPORTED = getFeaturesSupported();
    if (FEATURES_SUPPORTED.backButton && TG?.BackButton) {
        TG.BackButton.hide();
    }
};

export const haptic = {
    light: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    },
    medium: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
    },
    heavy: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
    },
    selection: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
        }
    },
    success: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    },
    warning: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
        }
    },
    error: () => {
        const FEATURES_SUPPORTED = getFeaturesSupported();
        if (FEATURES_SUPPORTED.haptic && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
    }
}; 