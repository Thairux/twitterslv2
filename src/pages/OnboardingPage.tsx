import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function OnboardingPage() {
  const [ageOk, setAgeOk] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const canContinue = ageOk && accepted;

  return (
    <div className="content-area">
      <h2 className="page-title">Welcome to TSL</h2>
      <p className="meta">This app is for people 16 and older.</p>
      <label className="check-label">
        <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
        I am 16 or older
      </label>
      <br /><br />
      <label className="check-label">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        I accept the basic community rules
      </label>
      <br /><br />
      <button className="btn" disabled={!canContinue} onClick={() => navigate('/')}>
        Continue
      </button>
    </div>
  );
}
