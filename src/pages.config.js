import DevTools from './pages/DevTools';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DevTools": DevTools,
    "Home": Home,
    "Landing": Landing,
    "Profile": Profile,
    "ProfileSetup": ProfileSetup,
}

export const pagesConfig = {
    mainPage: "DevTools",
    Pages: PAGES,
    Layout: __Layout,
};