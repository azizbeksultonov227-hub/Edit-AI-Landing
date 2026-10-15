import "./globals.css";

export const metadata = {
  title: "EditMaktab — Videomontaj yo‘l xaritasi",
  description: "Videomontajni o‘rganish va 90 kunda birinchi $500 ishlab topish uchun EditMaktab yo‘l xaritasi.",
};

import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '862434186479545');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=862434186479545&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
