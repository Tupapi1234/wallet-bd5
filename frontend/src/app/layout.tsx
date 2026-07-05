import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether Wallet | Multired Descentralizada",
  description: "Billetera multi-cadena de próxima generación para Solana, Bitcoin y BNB Chain. Gestión descentralizada mediante clave semilla con máxima seguridad local.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#030708] min-h-screen flex justify-center items-center">
        {/* Mobile View Container Simulation */}
        <div className="w-full max-w-md min-h-screen md:min-h-[85vh] md:max-h-[min(900px,96vh)] bg-[#0B0E14] md:rounded-[40px] md:border-[8px] md:border-[#1E232E] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative">
          
          {/* Subtle Mobile Screen Notch simulation for aesthetic premium feel */}
          <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#1E232E] rounded-b-2xl z-50 justify-center items-center">
            <div className="w-12 h-1 bg-[#030708] rounded-full"></div>
          </div>
          
          {/* Main App Content Area */}
          <main className="flex-1 w-full flex flex-col overflow-hidden relative pt-4 md:pt-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
