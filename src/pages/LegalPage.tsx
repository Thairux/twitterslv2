import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LegalPage() {
  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy');
  const navigate = useNavigate();

  return (
    <div className="content-area">
      <h2 className="page-title">Legal</h2>
      <div className="feed-tabs">
        <button className={tab === 'privacy' ? 'active' : ''} onClick={() => setTab('privacy')}>Privacy</button>
        <button className={tab === 'terms' ? 'active' : ''} onClick={() => setTab('terms')}>Terms</button>
      </div>
      <div className="tab-pane active-pane" style={{ marginTop: 12 }}>
        {tab === 'privacy' && (
          <div>
            <p><b>Privacy summary</b></p>
            <ul>
              <li>This app stores data locally on your device.</li>
              <li>Model endpoint and API keys are stored in secure storage.</li>
              <li>Persona memory is consent-gated.</li>
              <li>No cloud sync is enabled by default.</li>
            </ul>
          </div>
        )}
        {tab === 'terms' && (
          <div>
            <p><b>Terms summary</b></p>
            <ul>
              <li>Use the app responsibly.</li>
              <li>Do not misuse generated content.</li>
              <li>Features may change during development.</li>
            </ul>
          </div>
        )}
        <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          Close
        </button>
      </div>
    </div>
  );
}
