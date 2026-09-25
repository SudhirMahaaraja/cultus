// @maintained 2026-09-25T14:46:30.210Z
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cultus | Modern Sartorial Vision Office Outfit Assistant",
  description: "Executive wardrobe and AI outfit recommendation assistant",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cultus",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0a0d13",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#EAFBF7" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Prevent flash of wrong theme — runs before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cultus-theme');var isDark=t==='dark';document.documentElement.setAttribute('data-theme',isDark?'dark':'light');if(isDark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">

        {/* Lagoon gradient — single div, CSS handles light/dark switch via data-theme */}
        <div id="app-gradient" aria-hidden="true" />

        {children}

        {/* Dark mode toggle button */}
        <button
          id="theme-toggle-btn"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          <svg id="icon-sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <svg id="icon-moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        </button>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var btn = document.getElementById('theme-toggle-btn');
  var html = document.documentElement;

  function applyTheme(dark) {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  // Apply on load from stored preference
  applyTheme(localStorage.getItem('cultus-theme') === 'dark');

  btn.addEventListener('click', function() {
    var isDark = html.getAttribute('data-theme') === 'dark';
    var next = !isDark;
    localStorage.setItem('cultus-theme', next ? 'dark' : 'light');
    applyTheme(next);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
  }
})();
            `,
          }}
        />
      </body>
    </html>
  );
}
