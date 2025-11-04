export class UploadService {
    static async uploadImage(blob, metadata = {}) {
        try {
            // Получаем ID пользователя из Telegram WebApp
            const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            
            if (!userId) {
                throw new Error('User ID not available');
            }

            const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN;
            
            if (!BOT_TOKEN) {
                throw new Error('Bot token not configured');
            }

            // 1. Отправляем текстовое сообщение с информацией о фильме
            if (metadata.title && metadata.year && metadata.rating) {
                const caption = `🎬 ${metadata.title}\n📅 ${metadata.year}\n⭐️ ${metadata.rating}/10`;
                
                const messageFormData = new FormData();
                messageFormData.append('chat_id', userId);
                messageFormData.append('text', caption);

                await fetch(
                    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
                    {
                        method: 'POST',
                        body: messageFormData
                    }
                );
            }

            // 2. Отправляем изображение в чат с пользователем
            const formData = new FormData();
            formData.append('chat_id', userId);
            formData.append('photo', blob, 'story.jpg');

            const uploadResponse = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                throw new Error(error.description || 'Upload failed');
            }

            const uploadData = await uploadResponse.json();
            
            // 3. Получаем file_id самой большой версии фото
            const photos = uploadData.result.photo;
            const largestPhoto = photos[photos.length - 1];
            const fileId = largestPhoto.file_id;

            // 4. Получаем путь к файлу
            const fileResponse = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
            );

            if (!fileResponse.ok) {
                throw new Error('Failed to get file path');
            }

            const fileData = await fileResponse.json();
            const filePath = fileData.result.file_path;

            // 5. Формируем публичный URL файла
            return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        } catch (error) {
            console.error('Error uploading via Telegram Bot:', error);
            throw error;
        }
    }
} 