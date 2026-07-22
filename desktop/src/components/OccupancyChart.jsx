import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '08:00', students: 10 },
  { time: '09:00', students: 25 },
  { time: '10:00', students: 45 },
  { time: '11:00', students: 58 },
  { time: '12:00', students: 30 },
  { time: '13:00', students: 62 },
  { time: '14:00', students: 85 },
  { time: '15:00', students: 70 },
  { time: '16:00', students: 40 },
  { time: '17:00', students: 15 },
];

export default function OccupancyChart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Live Occupancy Trend</h3>
        <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-semibold">Today</span>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
