export default function DataTable({ columns, data, onEdit }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wider">
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4">{col.header}</th>
              ))}
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 text-gray-700">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onEdit(row)}
                      className="text-primary-600 hover:text-primary-800 font-medium text-sm transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Simple Pagination Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {data.length} records</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Previous</button>
          <button className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}
