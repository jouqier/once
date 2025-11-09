// Простой компонент skeleton для постеров и трейлеров
export class PosterSkeleton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const size = this.getAttribute('size') || 'large';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    flex: 0 0 auto;
                }

                .skeleton {
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.05) 25%,
                        rgba(255, 255, 255, 0.1) 50%,
                        rgba(255, 255, 255, 0.05) 75%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 8px;
                }

                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .skeleton.large {
                    width: 228px;
                    height: 342px;
                }

                .skeleton.small {
                    width: 128px;
                    height: 192px;
                }

                .skeleton.trailer {
                    width: 72px;
                    height: 72px;
                    border-radius: 999px;
                }

                .trailer-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 68px;
                }

                .trailer-title-skeleton {
                    width: 60px;
                    height: 12px;
                    margin-top: 8px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
            </style>
            ${size === 'trailer' ? `
                <div class="trailer-container">
                    <div class="skeleton trailer"></div>
                    <div class="skeleton trailer-title-skeleton"></div>
                </div>
            ` : `
                <div class="skeleton ${size}"></div>
            `}
        `;
    }
}

customElements.define('poster-skeleton', PosterSkeleton);
