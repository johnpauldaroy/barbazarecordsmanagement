import { Badge } from './ui/badge';

function StatusPill({ status, tone }) {
  return <Badge className={`status-pill status-pill--${tone}`} variant="outline">{status}</Badge>;
}

export default StatusPill;
