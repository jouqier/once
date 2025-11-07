/**
 * Утилита для управления Open Graph meta-тегами
 */
export class MetaTagsManager {
    /**
     * Обновляет Open Graph meta-теги для шаринга
     * @param {Object} options - Параметры для meta-тегов
     * @param {string} options.title - Заголовок
     * @param {string} options.description - Описание
     * @param {string} options.image - URL изображения
     * @param {string} options.url - URL страницы
     */
    static updateMetaTags({ title, description, image, url }) {
        // Обновляем title
        if (title) {
            document.title = title;
            this.setMetaTag('og:title', title);
        }

        // Обновляем description
        if (description) {
            this.setMetaTag('og:description', description);
        }

        // Обновляем image
        if (image) {
            this.setMetaTag('og:image', image);
            this.setMetaTag('og:image:secure_url', image);
        }

        // Обновляем URL
        if (url) {
            this.setMetaTag('og:url', url);
        }
    }

    /**
     * Устанавливает значение meta-тега
     * @param {string} property - Имя свойства (например, 'og:title')
     * @param {string} content - Содержимое
     */
    static setMetaTag(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        
        meta.setAttribute('content', content);
    }

    /**
     * Сбрасывает meta-теги к значениям по умолчанию
     */
    static resetMetaTags() {
        this.updateMetaTags({
            title: 'ONCE',
            description: 'Discover and track your favorite movies and TV shows',
            image: '',
            url: window.location.href
        });
    }
}
