

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Home, 
  Info,
  Users,
  Package,
  ArrowLeftRight,
  Sun,
  Moon,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

const navigationItems = [
  {
    title: "Főképernyő",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "Infók",
    url: createPageUrl("InfoHub"),
    icon: Info,
  },
  {
    title: "Beosztás",
    url: createPageUrl("BeosztasHub"),
    icon: Users,
  },
  {
    title: "Termékek",
    url: createPageUrl("TermekekHub"),
    icon: Package,
  },
  {
    title: "NF visszaküldés",
    url: createPageUrl("Returns"),
    icon: ArrowLeftRight,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('lidl-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('lidl-theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return (
    <>
      <style>{`
        :root {
          --background: 210 40% 98%;
          --foreground: 222.2 84% 4.9%;
          --card: 0 0% 100%;
          --card-foreground: 222.2 84% 4.9%;
          --popover: 0 0% 100%;
          --popover-foreground: 222.2 84% 4.9%;
          --primary: 221.2 83.2% 53.3%;
          --primary-foreground: 210 40% 98%;
          --secondary: 210 40% 96.1%;
          --secondary-foreground: 222.2 47.4% 11.2%;
          --muted: 210 40% 96.1%;
          --muted-foreground: 215.4 16.3% 46.9%;
          --accent: 210 40% 96.1%;
          --accent-foreground: 222.2 47.4% 11.2%;
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --ring: 221.2 83.2% 53.3%;
          
          --lidl-yellow: #FFB300;
          --lidl-blue: #0073e6;
          --lidl-red: #E53935;
        }
        
        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;
          --popover: 222.2 84% 4.9%;
          --popover-foreground: 210 40% 98%;
          --primary: 217.2 91.2% 59.8%;
          --primary-foreground: 222.2 47.4% 11.2%;
          --secondary: 217.2 32.6% 17.5%;
          --secondary-foreground: 210 40% 98%;
          --muted: 217.2 32.6% 17.5%;
          --muted-foreground: 215 20.2% 65.1%;
          --accent: 217.2 32.6% 17.5%;
          --accent-foreground: 210 40% 98%;
          --border: 217.2 32.6% 17.5%;
          --input: 217.2 32.6% 17.5%;
          --ring: 217.2 91.2% 59.8%;
        }
      `}</style>
      
      <div className="min-h-screen flex flex-col bg-background">
        {/* Top Bar */}
        <header className="bg-card/95 backdrop-blur-sm border-b px-4 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/supabaseClient-prod/public/68f346977dcf6281433bab47/9ae2cab07_Lidl_logo.png" 
              alt="Lidl Logo" 
              className="w-8 h-8" 
            />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Lidl App
            </h1>
          </div>
          
          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleTheme}>
                {isDarkMode ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" />
                    Világos mód
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" />
                    Sötét mód
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>

        {/* Fixed Bottom Navigation - Erős, fekete háttér */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-slate-200 dark:border-slate-800 z-30 shadow-2xl">
          <div className="grid grid-cols-5 h-16">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`
                    flex flex-col items-center justify-center gap-1 transition-colors duration-200
                    ${isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

