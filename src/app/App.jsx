import { useState } from 'react';
import { navigationManager } from '../config/navigation.js';
import { useNavigation } from './hooks/use-navigation.js';
import { Screen } from './Screen.jsx';
import { TabBar } from './components/tab-bar.jsx';
import { StoryViewer } from './components/story-viewer.jsx';

import story2 from '../../public/assets/stories/story2.jpg';
import story3 from '../../public/assets/stories/story3.jpg';
import story4 from '../../public/assets/stories/story4.jpg';
import story5 from '../../public/assets/stories/story5.jpg';

const WELCOME_STORIES = [story2, story3, story4, story5];

export function App({ showWelcomeStories = false }) {
    const { state } = useNavigation();
    const [storiesOpen, setStoriesOpen] = useState(showWelcomeStories);

    const finishStories = () => {
        setStoriesOpen(false);
        // Отмечаем, что приложение уже запускалось
        localStorage.setItem('app_launched', 'true');
        // Основной экран открывается после закрытия сторис
        navigationManager.navigateToTab('movies');
    };

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
            {storiesOpen && (
                <StoryViewer stories={WELCOME_STORIES} slideDuration={5000} onFinish={finishStories} />
            )}
        </div>
    );
}
