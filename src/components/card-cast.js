import { TG, haptic } from '../config/telegram.js';
import { API_CONFIG } from '../config/api.js';
import { i18n } from '../services/i18n.js';

export class MovieCast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._loadedImages = new Set();
    }

    set cast(value) {
        const filteredCast = value.filter(person => {
            // Актёры - те, у кого есть character
            if (person.character) return true;
            
            // Режиссёры - те, у кого job === 'Director'
            if (person.job === 'Director') return true;
            
            // Создатели сериалов - те, у кого job === 'Creator'
            if (person.job === 'Creator') return true;
            
            return false;
        });

        // Находим всех режиссёров и создателей
        const allDirectors = filteredCast.filter(p => p.job === 'Director');
        const allCreators = filteredCast.filter(p => p.job === 'Creator');
        
        let crewToShow = [];
        
        // Если есть создатели (для сериалов)
        if (allCreators.length > 0) {
            // Берём только одного создателя (первого)
            crewToShow = [allCreators[0]];
        } else if (allDirectors.length > 0) {
            // Для фильмов берём всех режиссёров
            crewToShow = allDirectors;
        }

        // Фильтруем только актёров (без режиссёров и создателей)
        const actors = filteredCast.filter(p => p.job !== 'Director' && p.job !== 'Creator');

        const uniqueCast = actors.reduce((acc, person) => {
            if (!acc.some(p => p.id === person.id)) {
                let role = '';
                if (person.character) {
                    role = person.character.split('/')[0].trim();
                }

                acc.push({
                    ...person,
                    character: role,
                    job: role
                });
            }
            return acc;
        }, []);

        // Добавляем режиссёров/создателей в начало списка
        for (const crew of crewToShow.reverse()) {
            uniqueCast.unshift({
                ...crew,
                character: crew.job, // 'Director' или 'Creator'
                job: crew.job
            });
        }
        
        this._cast = uniqueCast;
        this.render();
        this._setupImageLoading();
    }

    _setupImageLoading() {
        const images = this.shadowRoot.querySelectorAll('.cast-photo');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const img = entry.target;
                const imageUrl = img.getAttribute('data-src');
                
                if (entry.isIntersecting && imageUrl && !this._loadedImages.has(imageUrl)) {
                    this._loadedImages.add(imageUrl);
                    
                    // Предзагрузка изображения
                    const tempImage = new Image();
                    tempImage.onload = () => {
                        img.src = imageUrl;
                        img.style.opacity = '1';
                    };
                    
                    tempImage.onerror = () => {
                        const placeholder = img.parentElement.querySelector('.cast-photo-placeholder');
                        if (placeholder) {
                            img.style.display = 'none';
                            placeholder.style.display = 'flex';
                        }
                    };
                    
                    tempImage.src = imageUrl;
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    render() {
        if (!this._cast || this._cast.length === 0) {
            this.style.display = 'none';
            return;
        }
        
        this.style.display = 'flex';

        const castItems = this._cast.map(person => `
            <div class="cast-item" data-person-id="${person.id}">
                <div class="cast-photo-wrapper">
                    <img class="cast-photo" 
                         data-src="${API_CONFIG.IMAGE_BASE_URL}${person.profile_path}"
                         style="opacity: 0; transition: opacity 0.3s ease;"
                         alt="${person.name}"
                         >
                    <div class="cast-photo-placeholder" style="display: none;">
                        ${person.name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="cast-info">
                    <p class="cast-name">${person.name}</p>
                    <p class="cast-role">${person.character || person.job}</p>
                </div>
            </div>
        `).join('');

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    padding: 8px 0px;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                    border-radius: 36px;
                    background: var(--md-sys-color-surface);
                    overflow: hidden;
                }

                h1,
                h2,
                h3,
                h4,
                p {
                    margin: 0;
                }
                
                .title {
                    text-align: center;
                    font-size: 22px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 28px;
                    color: var(--md-sys-color-on-surface);
                }
                
                .title-info {
                    display: flex;
                    padding: 16px 24px;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    align-self: stretch;
                }
                
                .cast-container {
                    position: relative;
                    display: flex;
                    padding: 8px 0;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                    align-self: stretch;
                }

                .cast-list-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    scrollbar-width: none;
                }

                .cast-list-wrapper::-webkit-scrollbar {
                    display: none;
                }

                .cast-container::before,
                .cast-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 16px;
                    pointer-events: none;
                    z-index: 1;
                }

                .cast-container::before {
                    left: 0;
                    background: linear-gradient(to right, var(--md-sys-color-surface), transparent);
                }

                .cast-container::after {
                    right: 0;
                    background: linear-gradient(to left, var(--md-sys-color-surface), transparent);
                }

                .cast-list {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    flex-wrap: nowrap;
                    padding: 0 16px;
                }

                .cast-item {
                    display: flex;
                    width: 72px;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }
                
                .cast-photo-wrapper {
                    width: 72px;
                    height: 72px;
                    border-radius: 999px;
                    overflow: hidden;
                    background: #272A32;
                }
                
                .cast-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    filter: grayscale(100%);
                }
                
                .cast-photo-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #272A32;
                    color: #E0E2ED;
                    font-size: 24px;
                    font-weight: 600;
                }
                
                .cast-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    align-self: stretch;
                }
                
                .cast-name {
                    align-self: stretch;
                    color: var(--md-sys-color-on-surface);
                    text-align: center;
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                }
                
                .cast-role {
                    align-self: stretch;
                    color: var(--md-sys-color-outline);
                    text-align: center;
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                }
            </style>
            
            <div class="title-info">
                <div class="title">${i18n.t('castAndCrew')}</div>
            </div>

            <div class="cast-container">
                <div class="cast-list-wrapper">
                    <div class="cast-list">
                        ${castItems}
                        <div style="padding-right: 4px; flex-shrink: 0;"> </div>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.querySelectorAll('.cast-item').forEach(item => {
            item.addEventListener('click', () => {
                haptic.light();
                this.dispatchEvent(new CustomEvent('person-selected', {
                    detail: { personId: item.dataset.personId },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }

    disconnectedCallback() {
        // Очищаем Set при удалении компонента
        this._loadedImages.clear();
    }
}

customElements.define('movie-cast', MovieCast); 