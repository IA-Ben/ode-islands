"use client";

import { ShoppingCart } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <ShoppingCart className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Orders
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Coming Soon
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The Orders management feature is currently under development. This section will allow you to:
            </p>
            <ul className="text-left space-y-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>View and manage customer orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>Track order status and fulfillment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>Generate order reports and analytics</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
