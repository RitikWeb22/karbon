import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, ArrowRight, Building2, Lock, User as UserIcon, Mail, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [regMode, setRegMode] = useState('team'); // 'team' (with company code) or 'solo' (free workspace)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegister) {
        const codeToPass = regMode === 'team' ? companyCode.trim() : '';
        if (regMode === 'team' && !codeToPass) {
          toast.error('Please enter your Company / Workspace Invite Code to join your team.');
          setIsLoading(false);
          return;
        }

        await register(name, email, password, codeToPass);
        toast.success(
          codeToPass
            ? 'Account created & joined company workspace successfully!'
            : 'Welcome to Karbon! Personal Free workspace ready.'
        );
      } else {
        // Sign In - Strictly Email and Password
        await login(email, password);
        toast.success('Signed in successfully');
      }
      navigate('/board');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-[#111215]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-600/30 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Karbon</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Production Collaborative Workspace & Kanban
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex bg-[#18191d] p-1 rounded-xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* If Registering, offer Team Member vs Free Solo */}
        {isRegister && (
          <div className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRegMode('team')}
              className={`p-2 rounded-xl border text-left transition-all ${
                regMode === 'team'
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                  : 'border-white/5 bg-[#18191d]/60 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs mb-0.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Join Team</span>
              </div>
              <p className="text-[10px] text-zinc-400">Join via Company Code</p>
            </button>
            <button
              type="button"
              onClick={() => setRegMode('solo')}
              className={`p-2 rounded-xl border text-left transition-all ${
                regMode === 'solo'
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                  : 'border-white/5 bg-[#18191d]/60 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs mb-0.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Solo (Free)</span>
              </div>
              <p className="text-[10px] text-zinc-400">Personal Free workspace</p>
            </button>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="Work Email"
            type="email"
            placeholder={isRegister ? "name@company.com" : "ritikweb30@gmail.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label={isRegister ? "Create Password" : "Password"}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Company Code is ONLY shown when registering as a team member */}
          {isRegister && regMode === 'team' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Company Invite Code</span>
                <span className="text-[10px] text-rose-400 font-semibold">*Required</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. KARBON-PRO-2026"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                className="uppercase tracking-wider font-mono text-xs"
                required
              />
              <p className="text-[11px] text-zinc-400 leading-tight">
                Ask your workspace admin for the company code to access your team dashboard and tasks.
              </p>
            </div>
          )}

          {isRegister && regMode === 'solo' && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
              ✓ Free Tier includes 1 personal workspace, unlimited personal tasks, and standard Kanban board.
            </div>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full h-10 mt-3">
            <span>{isRegister ? (regMode === 'team' ? 'Register & Join Team' : 'Create Free Account') : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Security & Isolation Footnote */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Multi-Tenant Isolation • Role-Based RBAC</span>
        </div>
      </div>
    </div>
  );
};
