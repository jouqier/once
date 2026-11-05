import { useNavigation } from './hooks/use-navigation.js';
import { Screen } from './Screen.jsx';
import { TabBar } from './components/tab-bar.jsx';

export function App() {
    const { state } = useNavigation();

    return (
        // isolate держит z-index старых элементов внутри #app,
        // поэтому портал Drawer с z-50 оказывается над ними
        <div id="app" className="isolate">
            <div className="corner-top" />
            <div className="corner-bottom" />
            <main>
                <div className="relative z-1 flex-1">
                    <Screen state={state} />
                </div>
            </main>
            <TabBar />
        </div>
    );
}
