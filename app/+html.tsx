import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for static rendering.
 * It loads the Orbital Soft-Tech web fonts: Hanken Grotesk, Inter, and JetBrains Mono.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Google Fonts: Hanken Grotesk, Inter, JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />


        {/* Custom scrollbar styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Vertical scrollbar: auto-hide, show on hover/scroll */
          [data-class="scrollbar-vertical"] {
            scrollbar-width: thin;
            scrollbar-color: transparent transparent;
            transition: scrollbar-color 0.3s;
          }
          [data-class="scrollbar-vertical"]:hover,
          [data-class="scrollbar-vertical"]:active {
            scrollbar-color: rgba(128, 128, 128, 0.45) transparent;
          }
          [data-class="scrollbar-vertical"]::-webkit-scrollbar {
            width: 8px;
            background: transparent;
          }
          [data-class="scrollbar-vertical"]::-webkit-scrollbar-track {
            background: transparent;
          }
          [data-class="scrollbar-vertical"]::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 9999px;
            transition: background 0.3s;
          }
          [data-class="scrollbar-vertical"]:hover::-webkit-scrollbar-thumb,
          [data-class="scrollbar-vertical"]:active::-webkit-scrollbar-thumb {
            background: rgba(128, 128, 128, 0.45);
          }

          /* Horizontal scrollbar: always visible */
          [data-class="scrollbar-horizontal"] {
            scrollbar-width: thin;
            scrollbar-color: rgba(128, 128, 128, 0.45) transparent;
          }
          [data-class="scrollbar-horizontal"]::-webkit-scrollbar {
            height: 8px;
            background: transparent;
          }
          [data-class="scrollbar-horizontal"]::-webkit-scrollbar-track {
            background: transparent;
          }
          [data-class="scrollbar-horizontal"]::-webkit-scrollbar-thumb {
            background: rgba(128, 128, 128, 0.45);
            border-radius: 9999px;
          }
          [data-class="scrollbar-horizontal"]::-webkit-scrollbar-thumb:hover {
            background: rgba(128, 128, 128, 0.6);
          }

          /* Corner where both scrollbars meet */
          [data-class="scrollbar-vertical"]::-webkit-scrollbar-corner,
          [data-class="scrollbar-horizontal"]::-webkit-scrollbar-corner {
            background: transparent;
          }
        `}} />

        {/* Reset styles for React Native Web */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
