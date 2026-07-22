import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, Key, Info } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to log in');
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDemoFill = () => {
    setEmail('librarian@liblog.com');
    setPassword('librarian123');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#f8f5fd] to-[#f4ebfa] font-sans">
      
      {/* Branding */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-[#4B226E] rounded-2xl flex items-center justify-center shadow-sm mb-3">
          <BookOpen className="text-white" size={24} strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">LibLog</h1>
        <p className="text-xs text-[#666666] font-medium tracking-wide">Library Logbook Management System</p>
      </div>

      {/* Main Card */}
      <div className="w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#EAE3F2] overflow-hidden">
        
        <div className="p-10 flex flex-col items-center">
          <h2 className="text-[22px] font-bold text-[#1A1A1A] mb-1">Welcome back</h2>
          <p className="text-xs text-[#666666] mb-8">Sign in to access the library dashboard</p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
            {errorMsg && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm border border-red-100">
                {errorMsg}
              </div>
            )}
            {/* Email Field */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-bold text-[#1A1A1A]">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="librarian@liblog.com"
                className="w-full px-4 py-2.5 border border-[#E0D8EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4B226E]/20 focus:border-[#4B226E] placeholder-gray-400"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5 w-full relative">
              <label className="text-[13px] font-bold text-[#1A1A1A]">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-2.5 border border-[#E0D8EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4B226E]/20 focus:border-[#4B226E] placeholder-gray-400 font-medium tracking-widest"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <Eye size={18} />
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 bg-[#4B226E] rounded flex items-center justify-center">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.50005 5.87865L1.62137 3.99997L0.207153 5.41418L3.50005 8.70708L9.86396 2.34313L8.44975 0.928917L3.50005 5.87865Z" fill="white"/>
                </svg>
              </div>
              <Key size={12} className="text-[#666666] ml-1" />
              <span className="text-[11px] text-[#666666] font-medium">Save email & password</span>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="w-full bg-[#4B226E] hover:bg-[#3d1b5a] text-white font-semibold py-3 rounded-lg text-[13px] transition-colors mt-2"
            >
              Sign in
            </button>
          </form>
        </div>

        {/* Demo Credentials Box */}
        <div className="px-10 pb-8 bg-white">
          <div className="bg-[#fcf8ff] border border-[#e8ddf5] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Info size={14} className="text-[#4B226E]" />
              <span className="text-[11px] font-bold text-[#4B226E]">Demo Account</span>
            </div>
            
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] text-[#888888]">Email:</span>
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#e8ddf5] text-[#4B226E]">librarian@liblog.com</span>
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] text-[#888888]">Password:</span>
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#e8ddf5] text-[#4B226E]">librarian123</span>
            </div>

            <button 
              onClick={handleDemoFill}
              className="w-full mt-2 py-2 border border-[#d8c3ee] rounded-lg text-[#4B226E] text-[11px] font-bold hover:bg-[#f6f0fb] transition-colors"
            >
              Fill demo credentials
            </button>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-8">
        <p className="text-[10px] text-[#999999]">LibLog v2.0 — Library Management System</p>
      </div>

    </div>
  );
}
