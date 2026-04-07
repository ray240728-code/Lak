import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Shield, Info, BookOpen, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface StaticPageProps {
  title: string;
  type: 'security' | 'guide' | 'about' | 'salary';
  onBack: () => void;
}

export default function StaticPage({ title, type, onBack }: StaticPageProps) {
  const getContent = () => {
    switch (type) {
      case 'security':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <Shield className="w-8 h-8" />
              <h2 className="text-lg font-bold">Security & Safety Guide</h2>
            </div>
            <p className="text-sm text-blue-100">At LAKSHMI CLUB, your security is our top priority. We use advanced encryption and security protocols to ensure your data and funds are always safe.</p>
            <div className="space-y-3">
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <h4 className="text-sm font-bold text-white mb-1">Two-Factor Authentication</h4>
                <p className="text-xs text-blue-300">Enable 2FA to add an extra layer of security to your account.</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <h4 className="text-sm font-bold text-white mb-1">Secure Transactions</h4>
                <p className="text-xs text-blue-300">All deposits and withdrawals are processed through secure, encrypted channels.</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <h4 className="text-sm font-bold text-white mb-1">Privacy Policy</h4>
                <p className="text-xs text-blue-300">We never share your personal information with third parties without your explicit consent.</p>
              </div>
            </div>
          </div>
        );
      case 'guide':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <BookOpen className="w-8 h-8" />
              <h2 className="text-lg font-bold">Guide for Beginners</h2>
            </div>
            <div className="space-y-4">
              <section>
                <h4 className="text-sm font-bold text-white mb-2">1. How to Register</h4>
                <p className="text-xs text-blue-300">Click on the Register button, enter your mobile number, and set a strong password.</p>
              </section>
              <section>
                <h4 className="text-sm font-bold text-white mb-2">2. Making a Deposit</h4>
                <p className="text-xs text-blue-300">Go to the Wallet tab, click Deposit, choose your preferred method, and follow the instructions.</p>
              </section>
              <section>
                <h4 className="text-sm font-bold text-white mb-2">3. Playing WinGo</h4>
                <p className="text-xs text-blue-300">Choose a color (Green, Violet, Red) or a number (0-9). If your selection matches the result, you win!</p>
              </section>
              <section>
                <h4 className="text-sm font-bold text-white mb-2">4. Withdrawing Funds</h4>
                <p className="text-xs text-blue-300">Once you have winnings, go to Wallet {'>'} Withdraw, enter the amount and your bank details.</p>
              </section>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <Info className="w-8 h-8" />
              <h2 className="text-lg font-bold">About LAKSHMI CLUB</h2>
            </div>
            <p className="text-sm text-blue-100">LAKSHMI CLUB is a premier online gaming platform dedicated to providing a fair, exciting, and secure gaming experience for players across India.</p>
            <p className="text-sm text-blue-100">Founded in 2024, we have quickly become a trusted name in the industry, known for our transparent operations and fast payouts.</p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-blue-900/30 rounded-xl text-center">
                <p className="text-xl font-bold text-blue-400">1M+</p>
                <p className="text-[10px] text-blue-300">Active Users</p>
              </div>
              <div className="p-4 bg-blue-900/30 rounded-xl text-center">
                <p className="text-xl font-bold text-blue-400">24/7</p>
                <p className="text-[10px] text-blue-300">Support</p>
              </div>
            </div>
          </div>
        );
      case 'salary':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <FileText className="w-8 h-8" />
              <h2 className="text-lg font-bold">Salary Record</h2>
            </div>
            <p className="text-sm text-blue-100">Our agents earn competitive salaries based on their team performance and activity levels.</p>
            <Card className="border-none bg-[#2b3270] overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-blue-900/50 text-blue-300">
                    <tr>
                      <th className="p-3">Level</th>
                      <th className="p-3">Requirements</th>
                      <th className="p-3">Daily Salary</th>
                    </tr>
                  </thead>
                  <tbody className="text-white divide-y divide-blue-900/30">
                    <tr>
                      <td className="p-3">LV1</td>
                      <td className="p-3">5 Active Subs</td>
                      <td className="p-3">₹500</td>
                    </tr>
                    <tr>
                      <td className="p-3">LV2</td>
                      <td className="p-3">20 Active Subs</td>
                      <td className="p-3">₹2,000</td>
                    </tr>
                    <tr>
                      <td className="p-3">LV3</td>
                      <td className="p-3">50 Active Subs</td>
                      <td className="p-3">₹5,000</td>
                    </tr>
                    <tr>
                      <td className="p-3">LV4</td>
                      <td className="p-3">100 Active Subs</td>
                      <td className="p-3">₹12,000</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="p-4 flex items-center gap-4 bg-[#2b3270] border-b border-blue-900/50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6"
      >
        {getContent()}
      </motion.div>
    </div>
  );
}
