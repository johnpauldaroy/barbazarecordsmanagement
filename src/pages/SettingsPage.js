import { useState } from 'react';
import SectionHeading from '../components/SectionHeading';

const notificationOptions = [
  {
    key: 'slaAlerts',
    title: 'SLA alerts',
    description: 'Flag cases approaching review or approval thresholds.',
  },
  {
    key: 'supervisorUpdates',
    title: 'Supervisor updates',
    description: 'Notify processors when reviews are approved, returned, or reassigned.',
  },
  {
    key: 'dailyDigest',
    title: 'Daily digest',
    description: 'Send an end-of-day workload summary to the signed-in user.',
  },
];

const workflowOptions = [
  {
    key: 'autoAssign',
    title: 'Auto-assign new submissions',
    description: 'Route new cases based on program and current staff capacity.',
  },
  {
    key: 'duplicateLock',
    title: 'Lock duplicate releases',
    description: 'Require supervisor review before release actions are enabled.',
  },
  {
    key: 'remarksRequired',
    title: 'Require decision remarks',
    description: 'Force processors and supervisors to log remarks on final actions.',
  },
];

const securityOptions = [
  {
    key: 'mfaRequired',
    title: 'Require MFA for supervisors',
    description: 'Apply stronger sign-in verification for high-impact approvals.',
  },
  {
    key: 'deviceReview',
    title: 'Review new devices',
    description: 'Highlight first-time browser sign-ins in the audit queue.',
  },
  {
    key: 'exportApproval',
    title: 'Approve export downloads',
    description: 'Require Records Admin approval before bulk export is allowed.',
  },
];

function SettingsPage({ session }) {
  const [profile, setProfile] = useState({
    displayName: session?.name ?? 'Ana B. Ramos',
    email: session?.email ?? 'ana.ramos@barbaza.gov.ph',
    role: session?.role ?? 'MSWD Processor',
    landingPage: 'dashboard',
    density: 'comfortable',
  });
  const [notifications, setNotifications] = useState({
    slaAlerts: true,
    supervisorUpdates: true,
    dailyDigest: false,
  });
  const [workflow, setWorkflow] = useState({
    autoAssign: true,
    duplicateLock: true,
    remarksRequired: true,
    reviewHours: '48',
    approvalHours: '72',
  });
  const [security, setSecurity] = useState({
    mfaRequired: true,
    deviceReview: true,
    exportApproval: true,
    sessionTimeout: '30 minutes',
    passwordRotation: '90 days',
  });
  const [systemDefaults, setSystemDefaults] = useState({
    barangayScope: 'All barangays',
    queueView: 'Assigned to me',
    defaultProgram: 'AICS',
    retentionWindow: '5 years',
  });

  const handleProfileChange = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleWorkflowChange = (field) => (event) => {
    setWorkflow((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSecurityChange = (field) => (event) => {
    setSecurity((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSystemChange = (field) => (event) => {
    setSystemDefaults((current) => ({ ...current, [field]: event.target.value }));
  };

  const toggleGroupValue = (setter, key) => {
    setter((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="workspace-page">
      <section className="page-grid">
        <article className="panel">
          <SectionHeading eyebrow="User settings" title="Account profile" />
          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Display name</span>
              <input type="text" value={profile.displayName} onChange={handleProfileChange('displayName')} />
            </label>
            <label className="settings-field">
              <span>Government email</span>
              <input type="email" value={profile.email} onChange={handleProfileChange('email')} />
            </label>
            <label className="settings-field">
              <span>Role</span>
              <input type="text" value={profile.role} onChange={handleProfileChange('role')} />
            </label>
            <label className="settings-field">
              <span>Default landing page</span>
              <select value={profile.landingPage} onChange={handleProfileChange('landingPage')}>
                <option value="dashboard">Dashboard</option>
                <option value="applications">Applications</option>
                <option value="households">Households</option>
                <option value="reports">Reports</option>
                <option value="settings">Settings</option>
              </select>
            </label>
            <label className="settings-field">
              <span>Workspace density</span>
              <select value={profile.density} onChange={handleProfileChange('density')}>
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
          </div>
        </article>

        <article className="panel">
          <SectionHeading eyebrow="User settings" title="Notifications" />
          <div className="settings-stack">
            {notificationOptions.map((option) => (
              <label key={option.key} className="settings-toggle-row">
                <div>
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${notifications[option.key] ? 'settings-switch--on' : ''}`}
                  aria-pressed={notifications[option.key]}
                  onClick={() => toggleGroupValue(setNotifications, option.key)}
                >
                  <span />
                </button>
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="page-grid">
        <article className="panel">
          <SectionHeading eyebrow="Workflow" title="Processing controls" />
          <div className="settings-stack">
            {workflowOptions.map((option) => (
              <label key={option.key} className="settings-toggle-row">
                <div>
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${workflow[option.key] ? 'settings-switch--on' : ''}`}
                  aria-pressed={workflow[option.key]}
                  onClick={() => toggleGroupValue(setWorkflow, option.key)}
                >
                  <span />
                </button>
              </label>
            ))}
          </div>

          <div className="settings-form-grid settings-form-grid--compact">
            <label className="settings-field">
              <span>Review SLA</span>
              <input type="text" value={workflow.reviewHours} onChange={handleWorkflowChange('reviewHours')} />
            </label>
            <label className="settings-field">
              <span>Approval SLA</span>
              <input type="text" value={workflow.approvalHours} onChange={handleWorkflowChange('approvalHours')} />
            </label>
          </div>
        </article>

        <article className="panel">
          <SectionHeading eyebrow="Security" title="Access and session rules" />
          <div className="settings-stack">
            {securityOptions.map((option) => (
              <label key={option.key} className="settings-toggle-row">
                <div>
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${security[option.key] ? 'settings-switch--on' : ''}`}
                  aria-pressed={security[option.key]}
                  onClick={() => toggleGroupValue(setSecurity, option.key)}
                >
                  <span />
                </button>
              </label>
            ))}
          </div>

          <div className="settings-form-grid settings-form-grid--compact">
            <label className="settings-field">
              <span>Session timeout</span>
              <select value={security.sessionTimeout} onChange={handleSecurityChange('sessionTimeout')}>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>60 minutes</option>
              </select>
            </label>
            <label className="settings-field">
              <span>Password rotation</span>
              <select value={security.passwordRotation} onChange={handleSecurityChange('passwordRotation')}>
                <option>60 days</option>
                <option>90 days</option>
                <option>180 days</option>
              </select>
            </label>
          </div>
        </article>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="System defaults" title="Portal-wide configuration" />
        <div className="settings-form-grid">
          <label className="settings-field">
            <span>Barangay scope</span>
            <select value={systemDefaults.barangayScope} onChange={handleSystemChange('barangayScope')}>
              <option>All barangays</option>
              <option>Poblacion only</option>
              <option>Assigned barangays only</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Default queue view</span>
            <select value={systemDefaults.queueView} onChange={handleSystemChange('queueView')}>
              <option>Assigned to me</option>
              <option>All active cases</option>
              <option>Supervisor review</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Default program</span>
            <select value={systemDefaults.defaultProgram} onChange={handleSystemChange('defaultProgram')}>
              <option>AICS</option>
              <option>TUPAD</option>
              <option>Food support</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Retention window</span>
            <select value={systemDefaults.retentionWindow} onChange={handleSystemChange('retentionWindow')}>
              <option>3 years</option>
              <option>5 years</option>
              <option>7 years</option>
            </select>
          </label>
        </div>

        <div className="settings-action-row">
          <button type="button" className="action-button">
            Save settings
          </button>
          <button type="button" className="topbar-signout settings-secondary-button">
            Reset defaults
          </button>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
