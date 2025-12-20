// app/admin/sales/page.tsx

export default function SalesPage() {
  const sales = [
    { id: '1', date: '2025-01-15', product: 'Air Jordan 1 High', customer: 'John D.', amount: 220, cost: 175, profit: 45, status: 'completed' },
    { id: '2', date: '2025-01-15', product: 'Nike Dunk Low', customer: 'Sarah M.', amount: 180, cost: 145, profit: 35, status: 'completed' },
    { id: '3', date: '2025-01-14', product: 'Yeezy Boost 350', customer: 'Mike R.', amount: 350, cost: 270, profit: 80, status: 'completed' },
    { id: '4', date: '2025-01-14', product: 'New Balance 990', customer: 'Emily S.', amount: 200, cost: 160, profit: 40, status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales</h1>
          <p className="text-gray-400">Track orders and profit</p>
        </div>

        <div className="flex gap-2">
          <select className="bg-zinc-900 text-white px-4 py-2 rounded border border-red-900/20 text-sm">
            <option>All Status</option>
            <option>Completed</option>
            <option>Pending</option>
            <option>Refunded</option>
          </select>
          <select className="bg-zinc-900 text-white px-4 py-2 rounded border border-red-900/20 text-sm">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <span className="text-gray-400 text-sm">Total Sales</span>
          <div className="text-3xl font-bold text-white mt-2">87</div>
        </div>
        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <span className="text-gray-400 text-sm">Revenue</span>
          <div className="text-3xl font-bold text-white mt-2">$12,450</div>
        </div>
        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <span className="text-gray-400 text-sm">Profit</span>
          <div className="text-3xl font-bold text-green-400 mt-2">$3,210</div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-zinc-900 border border-red-900/20 rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-red-900/20 bg-zinc-800">
              <th className="text-left text-gray-400 font-semibold p-4">Date</th>
              <th className="text-left text-gray-400 font-semibold p-4">Product</th>
              <th className="text-left text-gray-400 font-semibold p-4">Customer</th>
              <th className="text-right text-gray-400 font-semibold p-4">Amount</th>
              <th className="text-right text-gray-400 font-semibold p-4">Profit</th>
              <th className="text-center text-gray-400 font-semibold p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-red-900/20 hover:bg-zinc-800">
                <td className="p-4 text-gray-400">{sale.date}</td>
                <td className="p-4 text-white">{sale.product}</td>
                <td className="p-4 text-gray-400">{sale.customer}</td>
                <td className="p-4 text-right text-white">${sale.amount}</td>
                <td className="p-4 text-right text-green-400">+${sale.profit}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                    sale.status === 'completed' ? 'bg-green-900/20 text-green-400' :
                    sale.status === 'pending' ? 'bg-yellow-900/20 text-yellow-400' :
                    'bg-red-900/20 text-red-400'
                  }`}>
                    {sale.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}