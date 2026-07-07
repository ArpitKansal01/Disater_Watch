import { Toaster } from "sonner";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="FHGUeV3sbQZ3h5rtd9GecIKHM8TOSW8_6npON3idvP8"
        />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />{" "}
        {/* ✅ Global toast mount */}
      </body>
    </html>
  );
}
