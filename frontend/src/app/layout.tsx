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
<<<<<<< HEAD
      <body className="bg-[#030708] min-h-screen flex justify-center items-center">
        {/* Mobile View Container Simulation */}
        <div className="w-full max-w-md min-h-screen md:min-h-[85vh] md:max-h-[900px] bg-[#0B0E14] md:rounded-[40px] md:border-[8px] md:border-[#1E232E] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative">
=======
      <body className="bg-[#030708] h-screen flex justify-center items-center overflow-hidden">
        {/* Mobile View Container Simulation */}
        <div className="w-full max-w-md h-full md:h-[85vh] md:max-h-[900px] bg-[#0B0E14] md:rounded-[40px] md:border-[8px] md:border-[#1E232E] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative">
>>>>>>> 41d814eac61af914e51f96a7aef5f0659ff54a0f
          
          {/* Subtle Mobile Screen Notch simulation for aesthetic premium feel */}
          <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#1E232E] rounded-b-2xl z-50 justify-center items-center">
            <div className="w-12 h-1 bg-[#030708] rounded-full"></div>
          </div>
          
          {/* Main App Content Area */}
<<<<<<< HEAD
          <main className="flex-1 w-full flex flex-col overflow-hidden relative pt-4 md:pt-6">
=======
          <main className="flex-1 w-full flex flex-col relative pt-4 md:pt-6 overflow-hidden">
>>>>>>> 41d814eac61af914e51f96a7aef5f0659ff54a0f
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
