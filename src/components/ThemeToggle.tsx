"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-zinc-200/80 dark:border-stone-800/80 hover:bg-zinc-100 dark:hover:bg-stone-800/40 transition-all text-zinc-500 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-stone-500/10 cursor-pointer active:scale-95"
            aria-label="Toggle Theme"
        >
            {theme === "light" ? (
                <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 hover:-rotate-12" />
            ) : (
                <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
            )}
        </button>
    );
}
