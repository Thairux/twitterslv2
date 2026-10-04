import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [ageOk, setAgeOk] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const canContinueStep1 = ageOk && accepted;

  return (
    <div className="content-area">
      <h2 className="page-title">Welcome to TSL</h2>
      {step === 1 && (
        <>
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
          <button className="btn" disabled={!canContinueStep1} onClick={() => setStep(2)}>
            Next
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <h3 style={{ marginBottom: 8 }}>How it works</h3>
          <p className="meta">
            <b>Feed</b> — See posts from people you follow and trending chatter in your timeline.<br/><br/>
            <b>Compose</b> — Create posts, share thoughts, or quote others.<br/><br/>
            <b>Models</b> — Choose between local GGUF models for private offline inference, or connect an endpoint for cloud generation.<br/><br/>
            <b>Settings</b> — Manage endpoints, API keys, persona memory, and data preferences.
          </p>
          <div className="field-row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setStep(1)}>Back</button>
            <button className="btn" onClick={() => setStep(3)}>Next</button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <h3 style={{ marginBottom: 8 }}>First actions</h3>
          <p className="meta">
            Try these to get started:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <div className="post" style={{ padding: '8px 12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Create your first post</div>
              <p className="meta" style={{ marginBottom: 4 }}>Head to the Compose tab and share something with the world.</p>
            </div>
            <div className="post" style={{ padding: '8px 12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Visit the Models tab</div>
              <p className="meta" style={{ marginBottom: 4 }}>Download a local GGUF model or configure an endpoint for AI generation.</p>
            </div>
            <div className="post" style={{ padding: '8px 12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Check Settings</div>
              <p className="meta" style={{ marginBottom: 4 }}>Review your endpoint, API key, and privacy preferences.</p>
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            <button className="btn" onClick={() => navigate('/')}>Get Started</button>
          </div>
        </>
      )}
    </div>
  );
}
