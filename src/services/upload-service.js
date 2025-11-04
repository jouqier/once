export class UploadService {
    static async uploadImage(blob, metadata = {}) {
        try {
            console.log('🔄 Starting upload process...');
            
            // Получаем ID пользователя из Telegram WebApp
            const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            console.log('👤 User ID:', userId);
            
            if (!userId) {
                console.error('❌ User ID not available');
                throw new Error('User ID not available');
            }

            const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN;
            console.log('🤖 Bot token exists:', !!BOT_TOKEN);
            
            if (!BOT_TOKEN) {
                console.error('❌ Bot token not configured');
                throw new Error('Bot token not configured');
            }

            // Формируем подпись к изображению
            let caption = '';
            if (metadata.title && metadata.year && metadata.rating) {
                caption = `🎬 ${metadata.title}\n📅 ${metadata.year}\n⭐️ ${metadata.rating}/10`;
                
                // Добавляем текст отзыва, если есть
                if (metadata.comment) {
                    caption += `\n\n💭 ${metadata.comment}`;
                }
            }

            // Отправляем изображение с подписью в одном сообщении
            console.log('📸 Uploading image with caption...');
            const formData = new FormData();
            formData.append('chat_id', userId);
            formData.append('photo', blob, 'story.jpg');
            
            // Добавляем caption если есть
            if (caption) {
                formData.append('caption', caption);
                console.log('📝 Caption:', caption);
            }

            const uploadResponse = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                console.error('❌ Upload failed:', error);
                throw new Error(error.description || 'Upload failed');
            }

            const uploadData = await uploadResponse.json();
            console.log('✅ Image uploaded successfully');
            
            // 3. Получаем file_id самой большой версии фото
            const photos = uploadData.result.photo;
            const largestPhoto = photos[photos.length - 1];
            const fileId = largestPhoto.file_id;
            console.log('📎 File ID:', fileId);

            // 4. Получаем путь к файлу
            const fileResponse = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
            );

            if (!fileResponse.ok) {
                console.error('❌ Failed to get file path');
                throw new Error('Failed to get file path');
            }

            const fileData = await fileResponse.json();
            const filePath = fileData.result.file_path;
            console.log('📂 File path:', filePath);

            // 5. Формируем публичный URL файла
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            console.log('🔗 File URL:', fileUrl);
            
            return fileUrl;

        } catch (error) {
            console.error('💥 Error uploading via Telegram Bot:', error);
            throw error;
        }
    }
} 