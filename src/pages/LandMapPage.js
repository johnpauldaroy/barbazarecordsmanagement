import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import SectionHeading from '../components/SectionHeading';
import { supabaseService } from '../supabaseService';
import 'leaflet/dist/leaflet.css';

const BARBAZA_CENTER = [11.195867, 122.038931];

const LEGEND_CONFIG = {
  all: {
    label: 'All households',
    color: '#475569',
    textColor: '#0f172a',
  },
  fourps: {
    label: "4Ps (Pantawid) - Yellow",
    color: '#facc15',
    textColor: '#713f12',
  },
  aics: {
    label: 'AICS - Blue',
    color: '#2563eb',
    textColor: '#1e3a8a',
  },
  other: {
    label: 'Other social program - Green',
    color: '#16a34a',
    textColor: '#14532d',
  },
  multiple: {
    label: 'Multiple programs - Violet',
    color: '#7c3aed',
    textColor: '#4c1d95',
  },
  none: {
    label: 'No availed program',
    color: '#94a3b8',
    textColor: '#334155',
  },
};

function normalizeProgramToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getLegendKey(programs = []) {
  if (!programs.length) {
    return 'none';
  }

  const normalized = programs.map((program) => normalizeProgramToken(program));
  const has4Ps = normalized.some((program) => program.includes('4ps') || program.includes('pantawid'));
  const hasAics = normalized.some((program) => program.includes('aics'));

  if (has4Ps) {
    return 'fourps';
  }

  if (hasAics && programs.length === 1) {
    return 'aics';
  }

  if (programs.length > 1) {
    return 'multiple';
  }

  return hasAics ? 'aics' : 'other';
}

function MapViewport({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(BARBAZA_CENTER, 12);
      return;
    }

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14);
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

function ProgramBadge({ text }) {
  const legendKey = getLegendKey([text]);
  const meta = LEGEND_CONFIG[legendKey] ?? LEGEND_CONFIG.other;

  return (
    <span
      className="land-map-program-badge"
      style={{ backgroundColor: `${meta.color}22`, color: meta.textColor, borderColor: `${meta.color}66` }}
    >
      {text}
    </span>
  );
}

function LandMapPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [mapRows, setMapRows] = useState([]);
  const [missingCoordinates, setMissingCoordinates] = useState([]);
  const [scopeInfo, setScopeInfo] = useState({ isScoped: false, barangayName: null });
  const [activeLegend, setActiveLegend] = useState('all');

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      setLoading(true);
      setErrorMessage('');

      try {
        const payload = await supabaseService.getHouseholdProgramMapData();

        if (!isMounted) {
          return;
        }

        setMapRows(payload.rows ?? []);
        setMissingCoordinates(payload.missingCoordinates ?? []);
        setScopeInfo({
          isScoped: Boolean(payload.scope?.isScoped),
          barangayName: payload.scope?.barangayName ?? null,
        });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Failed to load land map data.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  const rowsWithLegend = useMemo(
    () => mapRows.map((row) => ({ ...row, legendKey: getLegendKey(row.programs) })),
    [mapRows]
  );

  const visibleRows = useMemo(
    () => (activeLegend === 'all'
      ? rowsWithLegend
      : rowsWithLegend.filter((row) => row.legendKey === activeLegend)),
    [activeLegend, rowsWithLegend]
  );

  const legendCount = useMemo(() => rowsWithLegend.reduce((accumulator, row) => {
    const key = row.legendKey;
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {}), [rowsWithLegend]);

  return (
    <div className="workspace-page space-y-4">
      <section className="panel space-y-4">
        <SectionHeading
          eyebrow="Land Information"
          title={scopeInfo.isScoped
            ? `${scopeInfo.barangayName || 'Assigned barangay'} household map by social program`
            : 'Barbaza household map by social program'}
        />
        {errorMessage ? <div className="auth-alert">{errorMessage}</div> : null}
        {scopeInfo.isScoped ? (
          <div className="application-queue-note">
            <strong>Barangay view</strong>
            <p>Showing map data for {scopeInfo.barangayName || 'your assigned barangay'} only.</p>
          </div>
        ) : (
          <div className="application-queue-note">
            <strong>Municipality view</strong>
            <p>Showing map data across all barangays in Barbaza.</p>
          </div>
        )}
        <div className="land-map-summary">
          <div className="land-map-summary__item">
            <span>Mapped households</span>
            <strong>{rowsWithLegend.length}</strong>
          </div>
          <div className="land-map-summary__item">
            <span>No coordinates yet</span>
            <strong>{missingCoordinates.length}</strong>
          </div>
        </div>
        <p className="land-map-caption">
          Yellow markers are households with 4Ps enrollment. Suggested colors: AICS in blue, other
          social programs in green, and multiple programs in violet.
        </p>
      </section>

      <section className="panel space-y-4">
        <div className="land-map-legend">
          {Object.entries(LEGEND_CONFIG).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              className={`land-map-legend__chip ${activeLegend === key ? 'land-map-legend__chip--active' : ''}`}
              onClick={() => setActiveLegend(key)}
              style={{ '--legend-color': meta.color }}
            >
              <span className="land-map-legend__dot" />
              <span>{meta.label}</span>
              <strong>{key === 'all' ? rowsWithLegend.length : legendCount[key] ?? 0}</strong>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-load-spinner" role="status" aria-live="polite">
            Loading household map...
          </div>
        ) : (
          <div className="land-map-card">
            <MapContainer
              center={BARBAZA_CENTER}
              zoom={12}
              scrollWheelZoom
              className="land-map-canvas"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewport points={visibleRows} />
              {visibleRows.map((row) => {
                const legend = LEGEND_CONFIG[row.legendKey] ?? LEGEND_CONFIG.other;
                return (
                  <CircleMarker
                    key={row.code}
                    center={[row.latitude, row.longitude]}
                    radius={8}
                    pathOptions={{
                      color: '#0f172a',
                      weight: 1,
                      fillColor: legend.color,
                      fillOpacity: 0.92,
                    }}
                  >
                    <Popup>
                      <div className="land-map-popup">
                        <strong>{row.code}</strong>
                        <p>{row.head || 'Registered household'}</p>
                        <p>{row.fullAddress}</p>
                        <p><strong>Programs:</strong> {row.programs.length ? row.programs.join(', ') : 'None recorded'}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </section>

      {missingCoordinates.length ? (
        <section className="panel space-y-3">
          <SectionHeading eyebrow="Needs Coordinates" title="Households pending map pin" />
          <div className="land-map-missing-list">
            {missingCoordinates.map((row) => (
              <article key={row.code} className="land-map-missing-item">
                <div>
                  <strong>{row.code}</strong>
                  <p>{row.head || 'Registered household'}</p>
                  <small>{row.fullAddress}</small>
                </div>
                <div className="land-map-missing-item__programs">
                  {row.programs.length
                    ? row.programs.map((program) => <ProgramBadge key={`${row.code}-${program}`} text={program} />)
                    : <ProgramBadge text="No program tagged" />}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default LandMapPage;
