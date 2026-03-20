function StatusPill({ status, tone }) {
  return <mark className={`status-pill status-pill--${tone}`}>{status}</mark>;
}

export default StatusPill;
