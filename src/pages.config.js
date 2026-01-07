import Home from './pages/Home';
import Profile from './pages/Profile';
import DevTools from './pages/DevTools';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Profile": Profile,
    "DevTools": DevTools,
}

export const pagesConfig = {
    mainPage: "DevTools",
    Pages: PAGES,
    Layout: __Layout,
};