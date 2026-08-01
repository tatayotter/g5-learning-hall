export const metadata = {
  title: 'Learning Hall — Offline',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f1a', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
