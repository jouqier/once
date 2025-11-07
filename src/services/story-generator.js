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
        
        // Константы для стилей согласно дизайну
        this.STYLES = {
            POSTER: {
                WIDTH: 600,
                HEIGHT: 900,
                SIDE_MARGIN: 240,
                TOP_MARGIN: 360
            },
            RATING_BADGE: {
                WIDTH: 88,
                HEIGHT: 56,
                CORNER_RADIUS: 16,
                STAR_SIZE: 32,
                FONT_SIZE: 32,
                FONT_WEIGHT: 'bold',
                PADDING: 12,
                BACKGROUND: '#FFFFFF',
                TEXT_COLOR: '#000000'
            },
            COLORS: {
                WHITE: '#FFFFFF',
                BLACK: '#000000',
                OVERLAY: 'rgba(0, 0, 0, 0.7)'
            },
            TITLE: {
                FONT_SIZE: 36,
                LINE_HEIGHT: 1.2,
                MAX_LINES: 2,
                MARGIN_TOP: 32,
                SIDE_MARGIN: 120
            },
            YEAR: {
                FONT_SIZE: 36,
                MARGIN_TOP: 0,
                SIDE_MARGIN: 120
            },
            LOGO: {
                WIDTH: 180,
                HEIGHT: 48,
                BOTTOM_MARGIN: 240
            }
        };
    }

    _drawBackground(posterImage) {
        // Определяем платформу для оптимизации
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
        
        if (isIOS) {
            // Для iOS: без blur, просто рисуем постер и затемняем сильнее
            this.ctx.drawImage(posterImage, 
                -50, -50, 
                this.canvas.width + 100, this.canvas.height + 100
            );
            
            // Более сильное затемнение для iOS
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');    // Сильнее вверху
            gradient.addColorStop(1, 'rgba(0, 0, 0, 1.0)');  // Полностью черный внизу
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Для Android и других: используем blur
            this.ctx.save();
            this.ctx.filter = 'blur(60px)';
            this.ctx.drawImage(posterImage, 
                -50, -50, 
                this.canvas.width + 100, this.canvas.height + 100
            );
            this.ctx.restore();
            
            // Стандартное затемнение
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');    // Более темный вверху
            gradient.addColorStop(1, 'rgba(0, 0, 0, 1.0)');    // Самый темный внизу
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    _drawPoster(posterImage) {
        const posterX = this.STYLES.POSTER.SIDE_MARGIN;
        const posterY = this.STYLES.POSTER.TOP_MARGIN;
        const posterWidth = this.STYLES.POSTER.WIDTH;
        const posterHeight = this.STYLES.POSTER.HEIGHT;

        this.ctx.save();
        this._addShadow();
        
        // Рисуем постер с закругленными углами
        this._roundRect(posterX, posterY, posterWidth, posterHeight, 16);
        this.ctx.clip();
        this.ctx.drawImage(posterImage, posterX, posterY, posterWidth, posterHeight);
        
        this.ctx.restore();

        return { posterX, posterY, posterWidth, posterHeight };
    }

    async _drawRating(rating, posterData) {
        // Позиция бейджа: справа вверху на постере
        const badgeX = posterData.posterX + posterData.posterWidth - this.STYLES.RATING_BADGE.WIDTH - 16;
        const badgeY = posterData.posterY + 16;
        
        // Рисуем белый бейдж с закругленными углами
        this.ctx.save();
        this.ctx.fillStyle = this.STYLES.RATING_BADGE.BACKGROUND;
        this._roundRect(
            badgeX, 
            badgeY, 
            this.STYLES.RATING_BADGE.WIDTH, 
            this.STYLES.RATING_BADGE.HEIGHT, 
            this.STYLES.RATING_BADGE.CORNER_RADIUS
        );
        this.ctx.fill();
        
        // Загружаем и рисуем иконку звезды
        const starSvg = await this._loadSvg('/assets/svg/star.svg');
        this.ctx.drawImage(
            starSvg,
            badgeX + 12,
            badgeY + (this.STYLES.RATING_BADGE.HEIGHT - this.STYLES.RATING_BADGE.STAR_SIZE) / 2,
            this.STYLES.RATING_BADGE.STAR_SIZE,
            this.STYLES.RATING_BADGE.STAR_SIZE
        );
        
        // Рисуем число рейтинга
        this.ctx.font = `${this.STYLES.RATING_BADGE.FONT_WEIGHT} ${this.STYLES.RATING_BADGE.FONT_SIZE}px Inter`;
        this.ctx.fillStyle = this.STYLES.RATING_BADGE.TEXT_COLOR;
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            rating.toString(),
            badgeX + this.STYLES.RATING_BADGE.WIDTH - 12,
            badgeY + this.STYLES.RATING_BADGE.HEIGHT / 2
        );
        
        this.ctx.restore();
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
            await this._drawRating(rating, posterData);
            await this._drawLogo();

            // Сохраняем метаданные для передачи в upload service
            const metadata = {
                title: title,
                year: yearInfo,
                rating: rating,
                comment: review.text || ''
            };

            return await this._exportToJpeg(metadata);
        } catch (error) {
            console.error('Error generating story:', error);
            throw error;
        }
    }

    async _drawLogo() {
        const logoY = this.canvas.height - this.STYLES.LOGO.BOTTOM_MARGIN - this.STYLES.LOGO.HEIGHT;
        const logoX = (this.canvas.width - this.STYLES.LOGO.WIDTH) / 2;
        
        const logo = await this._loadSvg('/assets/svg/once-logo.svg');
        this.ctx.drawImage(logo, logoX, logoY, this.STYLES.LOGO.WIDTH, this.STYLES.LOGO.HEIGHT);
    }

    _roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
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
        const titleY = posterData.posterY + posterData.posterHeight + this.STYLES.TITLE.MARGIN_TOP;
        
        // Настройка шрифта для заголовка
        this.ctx.font = `bold ${this.STYLES.TITLE.FONT_SIZE}px Inter`;
        this.ctx.fillStyle = this.STYLES.COLORS.WHITE;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
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

    async _loadSvg(url) {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => response.text())
                .then(svgText => {
                    const img = new Image();
                    const blob = new Blob([svgText], { type: 'image/svg+xml' });
                    const blobUrl = URL.createObjectURL(blob);
                    
                    img.onload = () => {
                        URL.revokeObjectURL(blobUrl);
                        resolve(img);
                    };
                    img.onerror = reject;
                    img.src = blobUrl;
                })
                .catch(reject);
        });
    }
} 