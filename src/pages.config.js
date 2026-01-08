import DevTools from './pages/DevTools';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Landing from './pages/Landing';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DevTools": DevTools,
    "Home": Home,
    "Profile": Profile,
    "Landing": Landing,
}

export const pagesConfig = {
    mainPage: "DevTools",
    Pages: PAGES,
    Layout: __Layout,
};