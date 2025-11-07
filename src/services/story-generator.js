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
                WIDTH: 136,
                HEIGHT: 72,
                CORNER_RADIUS: 18,
                STAR_SIZE: 48,
                FONT_SIZE: 48,
                FONT_WEIGHT: 'bold',
                PADDING: 12,
                BACKGROUND: '#E1E2EC',
                TEXT_COLOR: '#2D3038'
            },
            COLORS: {
                WHITE: '#E1E2EC',
                BLACK: '#2D3038',
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
        this._roundRect(posterX, posterY, posterWidth, posterHeight, 36);
        this.ctx.clip();
        this.ctx.drawImage(posterImage, posterX, posterY, posterWidth, posterHeight);

        this.ctx.restore();

        return { posterX, posterY, posterWidth, posterHeight };
    }

    _drawRating(rating, posterData) {
        this.ctx.save();

        // Измеряем ширину текста рейтинга
        this.ctx.font = `${this.STYLES.RATING_BADGE.FONT_WEIGHT} ${this.STYLES.RATING_BADGE.FONT_SIZE}px Inter`;
        const textMetrics = this.ctx.measureText(rating.toString());
        const textWidth = textMetrics.width;

        // Вычисляем динамическую ширину бейджа
        // Формула: padding + star + gap + text + padding
        const starSize = this.STYLES.RATING_BADGE.STAR_SIZE;
        const padding = 12;
        const gap = 8; // расстояние между звездой и текстом
        const badgeWidth = padding + starSize + gap + textWidth + padding;
        const badgeHeight = this.STYLES.RATING_BADGE.HEIGHT;

        // Позиция бейджа: справа вверху на постере
        const badgeX = posterData.posterX + posterData.posterWidth - badgeWidth - 24;
        const badgeY = posterData.posterY + 24;

        // Рисуем белый бейдж с закругленными углами
        this.ctx.fillStyle = this.STYLES.RATING_BADGE.BACKGROUND;
        this._roundRect(
            badgeX,
            badgeY,
            badgeWidth,
            badgeHeight,
            this.STYLES.RATING_BADGE.CORNER_RADIUS
        );
        this.ctx.fill();

        // Рисуем иконку звезды напрямую через Path2D
        this._drawStar(
            badgeX + padding,
            badgeY + (badgeHeight - starSize) / 2,
            starSize
        );

        // Рисуем число рейтинга по центру оставшегося пространства
        this.ctx.fillStyle = this.STYLES.RATING_BADGE.TEXT_COLOR;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Центрируем текст между звездой и правым краем
        const textCenterX = badgeX + padding + starSize + gap + textWidth / 2;

        this.ctx.fillText(
            rating.toString(),
            textCenterX,
            badgeY + badgeHeight / 2
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
            console.log('🎬 Starting story generation...');
            console.log('Review data:', review);

            console.log('📥 Loading poster image...');
            const posterImage = await this._loadImage(
                `${API_CONFIG.IMAGE_BASE_URL.replace('/w500', '/original')}${movieData.poster_path}`
            );
            console.log('✅ Poster loaded');

            console.log('🎨 Drawing background...');
            this._drawBackground(posterImage);

            console.log('🖼️ Drawing poster...');
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

            console.log('✍️ Drawing title and year...');
            this._drawTitleAndYear(title, yearInfo, posterData);

            console.log('⭐ Drawing rating badge...');
            this._drawRating(rating, posterData);

            console.log('🏷️ Drawing logo...');
            this._drawLogo();

            console.log('💾 Exporting to JPEG...');
            // Сохраняем метаданные для передачи в upload service
            const metadata = {
                title: title,
                year: yearInfo,
                rating: rating,
                comment: review.text || ''
            };

            const result = await this._exportToJpeg(metadata);
            console.log('✅ Story generation complete!');
            return result;
        } catch (error) {
            console.error('❌ Error generating story:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    _drawLogo() {
        const logoY = this.canvas.height - this.STYLES.LOGO.BOTTOM_MARGIN - this.STYLES.LOGO.HEIGHT;
        const logoX = (this.canvas.width - this.STYLES.LOGO.WIDTH) / 2;

        this.ctx.save();
        this.ctx.translate(logoX, logoY);

        // Рисуем логотип "once" через Path2D
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

        // Буква "o"
        const path1 = new Path2D('M0 41.4029C0 45.8505 4.2065 49.0219 8.34605 47.6953L34.8273 39.2089C38.5846 38.0048 41.1429 34.4364 41.1429 30.3995V6.59709C41.1429 2.14953 36.9364 -1.02191 32.7968 0.304687L6.31553 8.7911C2.55825 9.99518 0 13.5636 0 17.6005V41.4029ZM20.5714 8.17803C19.1513 8.17803 18 9.35865 18 10.815V37.185C18 38.6414 19.1513 39.822 20.5714 39.822C21.9916 39.822 23.1429 38.6414 23.1429 37.185V10.815C23.1429 9.35865 21.9916 8.17803 20.5714 8.17803Z');
        this.ctx.fill(path1, 'evenodd');

        // Буква "n"
        const path2 = new Path2D('M46.2857 41.4029C46.2857 45.8505 50.4922 49.0219 54.6318 47.6953L64.2857 44.6015V10.815C64.2857 9.35865 65.437 8.17803 66.8571 8.17803C68.2773 8.17803 69.4286 9.35865 69.4286 10.815V37.5732C69.4286 40.2417 71.9525 42.1446 74.4362 41.3486L86.5264 37.4741C87.0631 37.3021 87.4286 36.7923 87.4286 36.2156V6.59709C87.4286 2.14953 83.2221 -1.02191 79.0825 0.304687L47.1879 10.5259C46.6512 10.6979 46.2857 11.2077 46.2857 11.7844V41.4029Z');
        this.ctx.fill(path2);

        // Буква "c"
        const path3 = new Path2D('M100.917 47.6953C96.7779 49.0219 92.5714 45.8505 92.5714 41.4029V17.6005C92.5714 13.5636 95.1297 9.99518 98.887 8.7911L125.368 0.304687C129.508 -1.02191 133.714 2.14953 133.714 6.59709V10.0877C133.714 11.8177 132.618 13.3471 131.008 13.8631L117.384 18.2292C116.556 18.4945 115.714 17.8602 115.714 16.9707V10.815C115.714 9.35865 114.563 8.17803 113.143 8.17803C111.723 8.17803 110.571 9.35865 110.571 10.815V37.185C110.571 38.6414 111.723 39.822 113.143 39.822C114.563 39.822 115.714 38.6414 115.714 37.185V32.1817C115.714 30.4516 116.811 28.9223 118.421 28.4062L132.045 24.0401C132.873 23.7748 133.714 24.4091 133.714 25.2986V30.3995C133.714 34.4364 131.156 38.0048 127.399 39.2089L100.917 47.6953Z');
        this.ctx.fill(path3);

        // Буква "e"
        const path4 = new Path2D('M147.203 47.6953C143.064 49.0219 138.857 45.8505 138.857 41.4029V17.6005C138.857 13.5636 141.415 9.99518 145.173 8.7911L171.654 0.304687C175.794 -1.02191 180 2.14953 180 6.59709V16.7092C180 20.7511 177.435 24.3228 173.672 25.5226L159.569 30.0185C157.956 30.5327 156.857 32.0634 156.857 33.7957V37.185C156.857 38.6414 158.008 39.822 159.429 39.822C160.849 39.822 162 38.6414 162 37.185C162 35.6159 162.994 34.229 164.455 33.7609L178.331 29.3141C179.159 29.0488 180 29.6831 180 30.5726V32.3382C180 35.2217 178.173 37.7706 175.489 38.6306L147.203 47.6953ZM161.999 10.747C161.964 9.32181 160.827 8.17752 159.429 8.17752C158.008 8.17752 156.857 9.35814 156.857 10.8145V25.318C156.857 26.0462 157.442 26.6534 158.13 26.4738C160.355 25.8929 162 23.8248 162 21.3625V10.815C162 10.7924 162 10.7694 161.999 10.747Z');
        this.ctx.fill(path4, 'evenodd');

        this.ctx.restore();
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


    _drawStar(x, y, size) {
        // Рисуем звезду напрямую через Path2D из SVG
        const scale = size / 48; // Оригинальный размер SVG 48x48

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);

        const starPath = new Path2D('M22.5643 6.90614C23.0253 5.97227 23.2558 5.50533 23.5687 5.35614C23.8409 5.22634 24.1572 5.22634 24.4294 5.35614C24.7423 5.50533 24.9728 5.97227 25.4338 6.90614L29.8072 15.7661C29.9432 16.0418 30.0113 16.1796 30.1107 16.2867C30.1988 16.3814 30.3044 16.4582 30.4217 16.5128C30.5541 16.5744 30.7063 16.5966 31.0105 16.6411L40.793 18.0709C41.8232 18.2215 42.3382 18.2968 42.5766 18.5484C42.784 18.7673 42.8815 19.0681 42.8421 19.3671C42.7967 19.7107 42.4238 20.0739 41.678 20.8003L34.6019 27.6924C34.3813 27.9072 34.2711 28.0146 34.1999 28.1424C34.1369 28.2556 34.0965 28.3799 34.0809 28.5085C34.0633 28.6538 34.0893 28.8055 34.1413 29.109L35.811 38.8438C35.9871 39.8705 36.0751 40.3839 35.9096 40.6885C35.7657 40.9536 35.5097 41.1395 35.2132 41.1945C34.8723 41.2577 34.4113 41.0152 33.4893 40.5303L24.7438 35.9312C24.4713 35.7879 24.3351 35.7162 24.1915 35.6881C24.0644 35.6632 23.9337 35.6632 23.8066 35.6881C23.6631 35.7162 23.5268 35.7879 23.2543 35.9312L14.5089 40.5303C13.5869 41.0152 13.1258 41.2577 12.785 41.1945C12.4884 41.1395 12.2325 40.9536 12.0885 40.6885C11.923 40.3839 12.0111 39.8705 12.1872 38.8438L13.8568 29.109C13.9089 28.8055 13.9349 28.6538 13.9173 28.5085C13.9017 28.3799 13.8612 28.2556 13.7982 28.1424C13.7271 28.0146 13.6168 27.9072 13.3962 27.6924L6.32014 20.8003C5.57435 20.0739 5.20145 19.7107 5.15608 19.3671C5.1166 19.0681 5.21413 18.7673 5.42152 18.5484C5.65989 18.2968 6.17497 18.2215 7.20511 18.0709L16.9876 16.6411C17.2919 16.5966 17.444 16.5744 17.5765 16.5128C17.6938 16.4582 17.7994 16.3814 17.8874 16.2867C17.9868 16.1796 18.0549 16.0418 18.191 15.7661L22.5643 6.90614Z');

        this.ctx.fillStyle = '#2D3038';
        this.ctx.fill(starPath);

        this.ctx.restore();
    }
} 