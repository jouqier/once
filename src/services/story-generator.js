import { API_CONFIG } from '../config/api.js';
import { UploadService } from './upload-service.js';

export class StoryGenerator {
    constructor(config = {}) {
        this.config = {
            width: config.width || 1080,
            height: config.height || 1920,
            styles: {
                poster: {
                    heightRatio: config.posterHeightRatio || 0.5,
                    topMargin: config.posterTopMargin || 0.1
                },
                // другие настройки
            }
        };
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        this.ctx = this.canvas.getContext('2d');
        
        // Добавим константы для стилей
        this.STYLES = {
            POSTER: {
                HEIGHT_RATIO: 0.5,
                SIDE_MARGIN: 240,
                TOP_MARGIN: 240
            },
            RATING: {
                STAR_SIZE: 48,
                STAR_GAP: 10,
                FONT_SIZE: 42,
                SIDE_MARGIN: 300,
                BOTTOM_MARGIN: 192,
                DIVIDER_WIDTH: 3,
                DIVIDER_HEIGHT: 64,
            },
            COLORS: {
                WHITE: '#FFFFFF',
                OVERLAY: 'rgba(0, 0, 0, 0.7)'
            },
            TITLE: {
                FONT_SIZE: 36,
                LINE_HEIGHT: 1.2,
                MAX_LINES: 2,
                SIDE_MARGIN: 120,
                TOP_MARGIN: 24     // отступ от постера
            },
            YEAR: {
                FONT_SIZE: 36,
                MARGIN_TOP: 0,
                SIDE_MARGIN: 120
            },
            LOGO: {
                BOTTOM_MARGIN: 121
            }
        };
    }

    // Разделим на отдельные методы
    _drawBackground(posterImage) {
        // Определяем платформу для оптимизации
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        if (isIOS) {
            // Для iOS: без blur, просто рисуем постер и затемняем сильнее
            this.ctx.drawImage(posterImage, 
                -50, -50, 
                this.canvas.width + 100, this.canvas.height + 100
            );
            
            // Более сильное затемнение для iOS
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');    // Сильнее вверху
            gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.6)'); // Еще темнее
            gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)'); // Очень темно
            gradient.addColorStop(1, 'rgba(0, 0, 0, 1.0)');  // Полностью черный внизу
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Для Android и других: используем blur
            this.ctx.save();
            this.ctx.filter = 'blur(120px)';
            this.ctx.drawImage(posterImage, 
                -50, -50, 
                this.canvas.width + 100, this.canvas.height + 100
            );
            this.ctx.restore();
            
            // Стандартное затемнение
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');    // Более темный вверху
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)'); // Еще темнее в середине
            gradient.addColorStop(1, 'rgba(0, 0, 0, 1.0)');    // Самый темный внизу
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    _drawPoster(posterImage) {
        const posterWidth = 600;
        const posterHeight = 900;
        const posterX = (this.canvas.width - posterWidth) / 2;
        const posterY = this.STYLES.POSTER.TOP_MARGIN;

        this.ctx.save();
        this._addShadow();
        this.ctx.drawImage(posterImage, posterX, posterY, posterWidth, posterHeight);
        this.ctx.restore();

        return { posterHeight, posterY, posterWidth };
    }

    _drawRating(rating, posterData) {
        const ratingY = 1388+32;
        
        //this._drawStars(rating, ratingY);
        this._drawRatingNumber(rating, ratingY);
    }

    _addShadow() {
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 10;
    }

    async generateReviewStory(movieData, review) {
        try {
            console.log('Review data:', review);
            
            const posterImage = await this._loadImage(
                `${API_CONFIG.IMAGE_BASE_URL.replace('/w500', '/original')}${movieData.poster_path}`
            );

            this._drawBackground(posterImage);
            const posterData = this._drawPoster(posterImage);
            
            // Формируем строку с годом или информацией о сезоне
            let yearInfo;
            if (movieData.media_type === 'tv_season' || movieData.media_type === 'tv') {
                // Используем данные напрямую из movieData для сезона
                const seasonNumber = movieData.season_number || review.season_number;
                const airDate = movieData.air_date || review.season_air_date;
                const seasonYear = airDate ? airDate.substring(0, 4) : '';
                
                console.log('TV Show data:', {
                    seasonNumber,
                    airDate,
                    seasonYear,
                    movieData
                });
                
                yearInfo = `Season ${seasonNumber}, ${seasonYear}`;
            } else {
                yearInfo = movieData.release_date 
                    ? movieData.release_date.substring(0, 4)
                    : '';
            }
            
            console.log('Final year info to display:', yearInfo);
            
            const title = movieData.title || movieData.name;
            const rating = parseInt(review.rating);
            
            this._drawTitleAndYear(title, yearInfo, posterData);
            this._drawRating(rating, posterData);

            // Сохраняем метаданные для передачи в upload service
            const metadata = {
                title: title,
                year: yearInfo,
                rating: rating,
                comment: review.text || '' // Добавляем текст отзыва
            };

            return await this._exportToJpeg(metadata);
        } catch (error) {
            console.error('Error generating story:', error);
            throw error;
        }
    }

    _drawStars(rating, ratingY) {
        const totalStars = 10;
        const startX = (this.canvas.width - (totalStars * (this.STYLES.RATING.STAR_SIZE + this.STYLES.RATING.STAR_GAP))) / 2;

        for (let i = 0; i < totalStars; i++) {
            this.ctx.fillStyle = i < rating ? this.STYLES.COLORS.WHITE : 'rgba(255, 255, 255, 0.3)';
            this.ctx.font = `${this.STYLES.RATING.STAR_SIZE}px Inter`;
            this.ctx.fillText('★', startX + (i * (this.STYLES.RATING.STAR_SIZE + this.STYLES.RATING.STAR_GAP)), ratingY);
        }
    }

    _drawRatingNumber(rating, ratingY) {
        const centerX = this.canvas.width / 2;
        
        // Рисуем число слева
        this.ctx.font = `bold ${this.STYLES.RATING.FONT_SIZE}px Inter`;
        this.ctx.fillStyle = this.STYLES.COLORS.WHITE;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${rating}`,
            centerX - 48,
            ratingY + 48
        );

        // Рисуем разделительную черту с поворотом
        this.ctx.save(); // Сохраняем текущее состояние контекста
        this.ctx.fillStyle = this.STYLES.COLORS.WHITE;
        
        // Перемещаем точку трансформации в центр черты
        this.ctx.translate(centerX, ratingY + this.STYLES.RATING.DIVIDER_HEIGHT / 2);
        // Поворачиваем на 20 градусов
        this.ctx.rotate(20 * Math.PI / 180);
        // Рисуем черту с учетом смещения на половину высоты
        this.ctx.fillRect(
            -this.STYLES.RATING.DIVIDER_WIDTH / 2,
            -this.STYLES.RATING.DIVIDER_HEIGHT / 2,
            this.STYLES.RATING.DIVIDER_WIDTH,
            this.STYLES.RATING.DIVIDER_HEIGHT
        );
        this.ctx.restore(); // Восстанавливаем состояние контекста

        // Рисуем "10" справа
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '10',
            centerX + 48,
            ratingY + 48
        );
    }

    _wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = this.ctx.measureText(currentLine + " " + word).width;
            
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        
        lines.push(currentLine);
        return lines;
    }

    _drawTitleAndYear(title, year, posterData) {
        const titleY = 1172+32;
        
        // Настройка шрифта для заголовка
        this.ctx.font = `bold ${this.STYLES.TITLE.FONT_SIZE}px Inter`;
        this.ctx.fillStyle = this.STYLES.COLORS.WHITE;
        this.ctx.textAlign = 'center';
        
        const maxWidth = this.canvas.width - (this.STYLES.TITLE.SIDE_MARGIN * 2);
        const lines = this._wrapText(title, maxWidth).slice(0, this.STYLES.TITLE.MAX_LINES);
        
        lines.forEach((line, index) => {
            this.ctx.fillText(
                line,
                this.canvas.width / 2,
                titleY + (index * this.STYLES.TITLE.FONT_SIZE * this.STYLES.TITLE.LINE_HEIGHT)
            );
        });
        
        // Отрисовка года в скобках
        this.ctx.font = `bold ${this.STYLES.YEAR.FONT_SIZE}px Inter`;
        this.ctx.fillText(
            `(${year})`,
            this.canvas.width / 2,
            titleY + (lines.length * this.STYLES.TITLE.FONT_SIZE * this.STYLES.TITLE.LINE_HEIGHT) + this.STYLES.YEAR.MARGIN_TOP
        );
    }

    async _exportToJpeg(metadata = {}) {
        return new Promise(resolve => {
            this.canvas.toBlob(async blob => {
                const url = await UploadService.uploadImage(blob, metadata);
                resolve(url);
            }, 'image/jpeg', 0.9);
        });
    }

    async _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }
} 