export class EpisodesBadge extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['watched-episodes', 'total-episodes'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const watchedEpisodes = parseInt(this.getAttribute('watched-episodes')) || 0;
        const totalEpisodes = parseInt(this.getAttribute('total-episodes')) || 0;
        
        // Если нет просмотренных эпизодов, компонент не отображается
        if (!watchedEpisodes) {
            this.shadowRoot.innerHTML = '';
            this.style.display = 'none';
            return;
        }

        this.style.display = 'flex';

        // Вычисляем процент для кругового прогресса
        const progressPercentage = totalEpisodes 
            ? (watchedEpisodes / totalEpisodes) * 100 
            : 0;

        const radius = 4;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - progressPercentage / 100);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    padding: 2px 5px;
                    justify-content: center;
                    align-items: center;
                    gap: 2px;
                    position: absolute;
                    right: 4px;
                    top: 4px;
                    border-radius: 4px;
                    background: var(--md-sys-color-surface-container-low);
                    z-index: 1;
                }

                .progress-ring {
                    width: 12px;
                    height: 12px;
                }

                .progress-ring__background {
                    fill: none;
                    stroke: var(--md-sys-color-on-surface);
                    opacity: 0.2;
                    stroke-width: 2;
                }

                .progress-ring__circle {
                    fill: none;
                    stroke: var(--md-sys-color-on-surface);
                    stroke-width: 2;
                    stroke-linecap: round;
                    transform-origin: center;
                    transform: rotate(-90deg);
                    transition: stroke-dashoffset 0.35s;
                }

                .value {
                    color: var(--md-sys-color-on-surface);
                    font-size: 11px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                }
            </style>

            <svg class="progress-ring" viewBox="0 0 12 12">
                <circle class="progress-ring__background"
                    cx="6" 
                    cy="6" 
                    r="${radius}"
                />
                <circle class="progress-ring__circle"
                    cx="6" 
                    cy="6" 
                    r="${radius}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                />
            </svg>
            <span class="value">${watchedEpisodes}</span>
        `;
    }
}

customElements.define('episodes-badge', EpisodesBadge);

