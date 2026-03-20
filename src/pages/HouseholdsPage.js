import { useState } from 'react';
import InteractiveTable from '../components/InteractiveTable';
import SectionHeading from '../components/SectionHeading';
import {
  defaultHouseholdCode,
  householdDetailsByCode,
  householdRows,
} from '../systemData';

function getHouseholdField(details, label) {
  return details.profile.find((item) => item.label === label)?.value ?? '-';
}

// ── Per-row action buttons for the household registry ────────────────────────
function HouseholdActions({ item }) {
  const [done, setDone] = useState(null);

  if (done) {
    return <span className="row-action-done">{done}</span>;
  }

  const hasOpenCases = Number(item.openCases) > 0;

  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="row-action row-action--primary"
        title="View profile"
        onClick={() => setDone('Opened')}
      >
        <span className="row-action__icon">⊙</span>
        <span className="row-action__label">Profile</span>
      </button>
      <button
        type="button"
        className={`row-action ${hasOpenCases ? 'row-action--warning' : 'row-action--success'}`}
        title={hasOpenCases ? 'View open cases' : 'File new case'}
        onClick={() => setDone(hasOpenCases ? 'Viewing' : 'Filed')}
      >
        <span className="row-action__icon">{hasOpenCases ? '!' : '+'}</span>
        <span className="row-action__label">{hasOpenCases ? 'Cases' : 'New case'}</span>
      </button>
    </div>
  );
}

function HouseholdsPage() {
  const [selectedCode, setSelectedCode] = useState(defaultHouseholdCode);
  const selectedDetails = householdDetailsByCode[selectedCode];
  const householdTableRows = householdRows.map((item) => {
    const details = householdDetailsByCode[item.code];

    return {
      ...item,
      address: getHouseholdField(details, 'Address'),
      incomeSource: getHouseholdField(details, 'Income source'),
      lastAssistance: getHouseholdField(details, 'Last assistance'),
    };
  });

  const columns = [
    {
      key: 'code',
      label: 'Code',
      render: (item) => <strong>{item.code}</strong>,
    },
    {
      key: 'head',
      label: 'Head',
    },
    {
      key: 'address',
      label: 'Address',
    },
    {
      key: 'incomeSource',
      label: 'Income source',
    },
    {
      key: 'lastAssistance',
      label: 'Last assistance',
    },
    {
      key: 'openCases',
      label: 'Open cases',
      getSortValue: (item) => Number(item.openCases),
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (item) => <HouseholdActions item={item} />,
    },
  ];

  return (
    <div className="workspace-page">
      <section className="panel">
        <SectionHeading eyebrow="Registry" title="Household lookup" />
        <InteractiveTable
          columns={columns}
          rows={householdTableRows}
          rowKey="code"
          selectedKey={selectedCode}
          onSelectRow={(row) => setSelectedCode(row.code)}
          searchLabel="Search households"
          searchPlaceholder="Search code, household head, address, or income source"
          initialSortKey="code"
          gridTemplate="1.1fr 1.2fr 1.4fr 1.1fr 1.3fr 0.8fr 170px"
        />
      </section>

      <section className="panel">
        <SectionHeading eyebrow="History" title="Recent assistance history" />
        <div className="list-stack">
          {selectedDetails.history.map((item) => (
            <div key={`${item.date}-${item.program}`} className="list-row list-row--stacked">
              <div>
                <span className="list-row__eyebrow">{item.date}</span>
                <strong>{item.program}</strong>
                <p>{item.details}</p>
              </div>
              <button
                type="button"
                className="row-action row-action--ghost row-action--sm"
                title="View details"
              >
                <span className="row-action__icon">⊙</span>
                <span className="row-action__label">Details</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HouseholdsPage;
