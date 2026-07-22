import { UserCheck, UserMinus, BookUp, BookDown } from 'lucide-react';

const mockActivities = [
  { id: 1, type: 'CHECK_IN', user: 'Maria Santos', program: 'BS Nursing', time: '2 mins ago' },
  { id: 2, type: 'BORROW', user: 'Juan Dela Cruz', book: 'Anatomy & Physiology', time: '15 mins ago' },
  { id: 3, type: 'CHECK_OUT', user: 'Ana Reyes', program: 'BS Midwifery', time: '18 mins ago' },
  { id: 4, type: 'RETURN', user: 'Pedro Gomez', book: 'Public Administration 101', time: '1 hour ago' },
  { id: 5, type: 'CHECK_IN', user: 'Clara Diaz', program: 'BS Education', time: '1 hour ago' },
];

const getIcon = (type) => {
  switch (type) {
    case 'CHECK_IN': return <UserCheck size={18} className="text-green-600" />;
    case 'CHECK_OUT': return <UserMinus size={18} className="text-gray-500" />;
    case 'BORROW': return <BookUp size={18} className="text-primary-600" />;
    case 'RETURN': return <BookDown size={18} className="text-purple-600" />;
    default: return null;
  }
};

const getBg = (type) => {
  switch (type) {
    case 'CHECK_IN': return 'bg-green-100';
    case 'CHECK_OUT': return 'bg-gray-100';
    case 'BORROW': return 'bg-primary-100';
    case 'RETURN': return 'bg-purple-100';
    default: return 'bg-gray-100';
  }
};

export default function ActivityFeed() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Activity</h3>
      <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-2">
        {mockActivities.map(activity => (
          <div key={activity.id} className="flex items-start gap-4">
            <div className={`p-2 rounded-full shrink-0 ${getBg(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold text-gray-800">{activity.user}</span>
              <span className="text-xs text-gray-500">
                {activity.type === 'CHECK_IN' && `Checked in • ${activity.program}`}
                {activity.type === 'CHECK_OUT' && `Checked out • ${activity.program}`}
                {activity.type === 'BORROW' && `Borrowed "${activity.book}"`}
                {activity.type === 'RETURN' && `Returned "${activity.book}"`}
              </span>
            </div>
            <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
