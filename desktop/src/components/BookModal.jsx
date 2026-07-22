import { X } from 'lucide-react';

export default function BookModal({ isOpen, onClose, book }) {
  if (!isOpen) return null;

  const handleIsbnChange = (e) => {
    const v = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (v.length > 0) formatted += v.substring(0, 3);
    if (v.length > 3) formatted += '-' + v.substring(3, 4);
    if (v.length > 4) formatted += '-' + v.substring(4, 7);
    if (v.length > 7) formatted += '-' + v.substring(7, 12);
    if (v.length > 12) formatted += '-' + v.substring(12, 13);
    e.target.value = formatted;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal Box */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">
            {book ? 'Edit Book Record' : 'Add New Book'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" defaultValue={book?.title} placeholder="Enter book title" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
            <input type="text" onChange={handleIsbnChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all" defaultValue={book?.isbn} placeholder="978-..." />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all" defaultValue={book?.author} placeholder="Author name" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all" defaultValue={book?.genre || ''}>
              <option value="" disabled>Select Genre</option>
              <option value="Nursing">Nursing</option>
              <option value="Midwifery">Midwifery</option>
              <option value="Research">Research</option>
              <option value="English">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
            <input type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all" defaultValue={book?.total_copies || 1} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
            {book ? 'Save Changes' : 'Create Book'}
          </button>
        </div>
      </div>
    </div>
  );
}
