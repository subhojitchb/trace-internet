import "./globals.css";
export const metadata = { title: "TRACE — Never lose an idea again", description: "A personal memory layer for the internet." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" data-theme="dark" suppressHydrationWarning><body>{children}</body></html>);
}
