import React from "react"; // Import React explicitly (optional in React 17+)
import PropTypes from "prop-types"; // Import PropTypes
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Finelytics",
  description:
    "Finelytics: AI-driven insights to manage expenses and optimize your finances.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          data-gramm="false"
          suppressHydrationWarning
          className={`${inter.className}`}
        >
          {/* header */}
          <Header />
          {/* main content */}
          <main className="min-h-screen">{children}</main>
          <Toaster richColors />
          {/* footer */}
          <footer className="bg-blue-50 py-12">
            <div className="container mx-auto px-4 text-center text-gray-600">
              <p>© 2025 Finelytics. All rights reserved.</p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}

// Add PropTypes validation
RootLayout.propTypes = {
  children: PropTypes.node.isRequired, // Validate children
};
