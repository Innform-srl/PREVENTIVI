import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrore('');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange in App si occupa del redirect
    } catch (error) {
      setErrore(error.message === 'Invalid login credentials' ? 'Email o password non validi.' : 'Errore di accesso: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', boxSizing: 'border-box', fontSize: '14px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '40px 36px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Budget Planner Multi-Aula</h1>
        <p style={{ margin: '6px 0 28px', color: '#64748b', fontSize: '13px' }}>Accedi con il tuo account Innform • <span style={{ color: '#2563eb' }}>☁️ Supabase</span></p>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="nome@innform.eu" style={{ ...inputStyle, marginBottom: '16px' }} />

        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" style={{ ...inputStyle, marginBottom: '20px' }} />

        {errore && <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px' }}>⚠️ {errore}</div>}

        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: 'white', fontWeight: '600', fontSize: '14px', opacity: isLoading ? 0.7 : 1 }}>
          {isLoading ? 'Accesso in corso…' : '🔐 Accedi'}
        </button>
      </form>
    </div>
  );
};

export default Login;
