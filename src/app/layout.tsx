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
      <body>
        {children}
        <Toaster richColors position="top-right" />{" "}
        {/* ✅ Global toast mount */}
      </body>
    </html>
  );
}
