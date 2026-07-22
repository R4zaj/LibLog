export default function StatCard({ title, value, icon: Icon, trend, trendLabel, colorClass }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-sm font-medium">{title}</span>
          <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
        </div>
        <div className={`p-3 rounded-xl ${colorClass.replace('text-', 'bg-').replace('600', '100')} ${colorClass}`}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
