import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import DailyInfo from "./DailyInfo";

import Distributions from "./Distributions";

import Returns from "./Returns";

import WeeklyInfo from "./WeeklyInfo";

import InstantInfo from "./InstantInfo";

import MissingProducts from "./MissingProducts";

import Schedule from "./Schedule";

import Employees from "./Employees";

import InfoHub from "./InfoHub";

import BeosztasHub from "./BeosztasHub";

import TermekekHub from "./TermekekHub";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    DailyInfo: DailyInfo,
    
    Distributions: Distributions,
    
    Returns: Returns,
    
    WeeklyInfo: WeeklyInfo,
    
    InstantInfo: InstantInfo,
    
    MissingProducts: MissingProducts,
    
    Schedule: Schedule,
    
    Employees: Employees,
    
    InfoHub: InfoHub,
    
    BeosztasHub: BeosztasHub,
    
    TermekekHub: TermekekHub,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/DailyInfo" element={<DailyInfo />} />
                
                <Route path="/Distributions" element={<Distributions />} />
                
                <Route path="/Returns" element={<Returns />} />
                
                <Route path="/WeeklyInfo" element={<WeeklyInfo />} />
                
                <Route path="/InstantInfo" element={<InstantInfo />} />
                
                <Route path="/MissingProducts" element={<MissingProducts />} />
                
                <Route path="/Schedule" element={<Schedule />} />
                
                <Route path="/Employees" element={<Employees />} />
                
                <Route path="/InfoHub" element={<InfoHub />} />
                
                <Route path="/BeosztasHub" element={<BeosztasHub />} />
                
                <Route path="/TermekekHub" element={<TermekekHub />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}