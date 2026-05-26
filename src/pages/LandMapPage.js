import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import SectionHeading from '../components/SectionHeading';
import { supabaseService } from '../supabaseService';

// Fix webpack-broken Leaflet default marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const BARBAZA_CENTER = [11.195867, 122.038931];
const BARBAZA_BOUNDS = [
  [11.14, 121.98],
  [11.27, 122.12],
];
const BARBAZA_MAP_BOUNDS = L.latLngBounds(BARBAZA_BOUNDS);
const BARBAZA_PAN_BOUNDS = BARBAZA_MAP_BOUNDS.pad(0.25);

const LEGEND_CONFIG = {
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
  tupad: {
    label: 'TUPAD - Green',
    color: '#16a34a',
    textColor: '#14532d',
  },
};

const UNTAGGED_STYLE = {
  color: '#94a3b8',
  textColor: '#334155',
};

function normalizeProgramToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getLegendKey(programs = []) {
  if (!programs.length) {
    return null;
  }

  const normalized = programs.map((program) => normalizeProgramToken(program));
  const has4Ps = normalized.some((program) => program.includes('4ps') || program.includes('pantawid'));
  const hasAics = normalized.some((program) => program.includes('aics') || program.includes('assistancetoindividuals'));
  const hasTupad = normalized.some((program) => program.includes('tupad') || program.includes('tulongpanghanapbuhay'));

  if (has4Ps) {
    return 'fourps';
  }

  if (hasAics) {
    return 'aics';
  }

  if (hasTupad) {
    return 'tupad';
  }

  return null;
}

function isPointInBarbazaBounds(point) {
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);

  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && BARBAZA_MAP_BOUNDS.contains([latitude, longitude]);
}

function MapViewport({ points }) {
  const map = useMap();

  useEffect(() => {
    const barbazaPoints = points.filter(isPointInBarbazaBounds);

    map.setMaxBounds(BARBAZA_PAN_BOUNDS);

    if (!barbazaPoints.length) {
      map.fitBounds(BARBAZA_MAP_BOUNDS, { padding: [24, 24] });
      return;
    }

    if (barbazaPoints.length === 1) {
      map.setView([barbazaPoints[0].latitude, barbazaPoints[0].longitude], 14);
      return;
    }

    const bounds = L.latLngBounds(barbazaPoints.map((point) => [point.latitude, point.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);

  return null;
}

function ProgramBadge({ text }) {
  const legendKey = getLegendKey([text]);
  const meta = legendKey ? LEGEND_CONFIG[legendKey] : UNTAGGED_STYLE;

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
  const [legendKeys, setLegendKeys] = useState(Object.keys(LEGEND_CONFIG));
  const [activeLegend, setActiveLegend] = useState(null);

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
        setLegendKeys((payload.legendKeys ?? Object.keys(LEGEND_CONFIG)).filter((key) => key in LEGEND_CONFIG));
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

  useEffect(() => {
    if (activeLegend && !legendKeys.includes(activeLegend)) {
      setActiveLegend(null);
    }
  }, [activeLegend, legendKeys]);

  const visibleLegendEntries = useMemo(
    () => legendKeys.map((key) => [key, LEGEND_CONFIG[key]]).filter(([, meta]) => Boolean(meta)),
    [legendKeys]
  );

  const rowsWithLegend = useMemo(
    () => mapRows.map((row) => {
      const legendKey = getLegendKey(row.programs);
      return {
        ...row,
        legendKey: legendKey && legendKeys.includes(legendKey) ? legendKey : null,
      };
    }),
    [legendKeys, mapRows]
  );

  const visibleRows = useMemo(
    () => {
      const mappableRows = rowsWithLegend.filter(isPointInBarbazaBounds);
      return !activeLegend
        ? mappableRows
        : mappableRows.filter((row) => row.legendKey === activeLegend);
    },
    [activeLegend, rowsWithLegend]
  );

  const legendCount = useMemo(() => rowsWithLegend.reduce((accumulator, row) => {
    const key = row.legendKey;
    if (!key || !(key in LEGEND_CONFIG)) {
      return accumulator;
    }
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
        {visibleLegendEntries.length ? (
          <p className="land-map-caption">
            Program legend colors show enabled programs only.
          </p>
        ) : null}
      </section>

      <section className="panel space-y-4">
        <div className="land-map-legend">
          {visibleLegendEntries.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              className={`land-map-legend__chip ${activeLegend === key ? 'land-map-legend__chip--active' : ''}`}
              onClick={() => setActiveLegend((current) => (current === key ? null : key))}
              style={{ '--legend-color': meta.color }}
            >
              <span className="land-map-legend__dot" />
              <span>{meta.label}</span>
              <strong>{legendCount[key] ?? 0}</strong>
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
              zoom={13}
              minZoom={12}
              maxBounds={BARBAZA_PAN_BOUNDS}
              maxBoundsViscosity={1}
              scrollWheelZoom
              className="land-map-canvas"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                noWrap
              />
              <MapViewport points={visibleRows} />
              {visibleRows.map((row) => {
                const legend = row.legendKey ? LEGEND_CONFIG[row.legendKey] : UNTAGGED_STYLE;
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
