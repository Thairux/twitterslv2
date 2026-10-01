import { useState, useEffect } from 'react';

export interface AppLockProps {
  onUnlock: () => void;
}

export function AppLock({ onUnlock }: AppLockProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const stored = '0000';

  useEffect(() => {
    const saved = localStorage.getItem('tsl-app-lock-code');
    if (!saved) {
      localStorage.setItem('tsl-app-lock-code', stored);
    }
  }, []);

  const handleSubmit = () => {
    const expected = localStorage.getItem('tsl-app-lock-code') ?? stored;
    if (code === expected) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect code');
    }
  };

  return (
    <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 className="page-title">App Lock</h2>
      <p className="meta">Enter PIN to unlock.</p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="Enter PIN to unlock."
        className="input-field"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button className="btn" onClick={handleSubmit}>Unlock</button>
    </div>
  );
}
