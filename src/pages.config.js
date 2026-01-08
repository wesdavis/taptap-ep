import DevTools from './pages/DevTools';
import Home from './pages/Home';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DevTools": DevTools,
    "Home": Home,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "DevTools",
    Pages: PAGES,
    Layout: __Layout,
};