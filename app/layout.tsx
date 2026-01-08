import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/app/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ร้านไก่ย่างพังโคน - POS',
  description: 'ระบบจัดการร้านอาหาร',
}

export default function RootLayout({
  children,
}: {
  children: React. ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter. className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}