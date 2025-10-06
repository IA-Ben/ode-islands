"use client";

import { ShoppingCart, Plus, Filter } from 'lucide-react';
import { surfaces, gradients, buttons } from '@/lib/admin/designTokens';

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${gradients.primary} flex items-center justify-center shadow-lg`}>
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Orders
                </h1>
                <p className="text-slate-400 mt-1">
                  View and manage customer orders and transactions
                </p>
              </div>
            </div>
            <button className={buttons.secondary}>
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className={`${surfaces.cardGlass} rounded-xl p-8 border border-slate-700/50`}>
          <div className="text-center py-12">
            <div className={`w-24 h-24 rounded-2xl ${gradients.primary} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
              <ShoppingCart className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Orders Management Coming Soon
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              The Orders management feature is currently under development. This comprehensive tool will help you manage all customer transactions and order fulfillment.
            </p>
            <div className={`${surfaces.subtleGlass} rounded-xl p-6 border border-slate-700/50 max-w-2xl mx-auto`}>
              <h3 className="text-lg font-semibold text-white mb-4">Planned Features</h3>
              <ul className="text-left space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>View and manage all customer orders in one place</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Track order status and fulfillment progress</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Generate order reports and analytics dashboards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Process refunds and manage customer support tickets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fuchsia-400 mt-1">•</span>
                  <span>Export order data for accounting and reporting</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
