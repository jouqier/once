import { useEffect, useRef } from 'react';
import { navigationManager } from '../config/navigation.js';
import { useNavigation } from './hooks/use-navigation.js';
import { Screen } from './Screen.jsx';

export function App() {
    const { state } = useNavigation();
    const tabBarRef = useRef(null);

    // В v1 активный таб в <tab-bar> выставлял обработчик tab-changed в main.js.
    // Теперь он берётся из навигации: currentTab меняется только при переходе на таб.
    useEffect(() => {
        tabBarRef.current?.setActiveTab(navigationManager.currentTab);
    }, [state]);

    return (
        // isolate держит z-index старых элементов (таб-бар 1000) внутри #app,
        // поэтому портал Drawer с z-50 оказывается над ними
        <div id="app" className="isolate">
            <div className="corner-top" />
            <div className="corner-bottom" />
            <main>
                <div className="relative z-1 flex-1">
                    <Screen state={state} />
                </div>
            </main>
            <tab-bar ref={tabBarRef} />
        </div>
    );
}
