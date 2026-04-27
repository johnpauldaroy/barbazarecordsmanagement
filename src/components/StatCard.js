import { Card, CardContent } from './ui/card';
import { CheckCircle2, ClipboardList, FileClock, UsersRound } from 'lucide-react';

const toneIcon = {
  accent: ClipboardList,
  default: FileClock,
  good: CheckCircle2,
  warning: UsersRound,
};

function getProgressValue(value) {
  const numericValue = Number(String(value).replace(/[^\d.]/g, ''));

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 16;
  }

  return Math.max(18, Math.min(92, numericValue * 12));
}

function StatCard({ label, value, trend, tone = 'default' }) {
  const Icon = toneIcon[tone] ?? toneIcon.default;
  const progress = getProgressValue(value);

  return (
    <Card className={`stat-card stat-card--${tone}`}>
      <CardContent>
        <div className="stat-card__topline">
          <span>{label}</span>
          <span className="stat-card__icon" aria-hidden="true">
            <Icon />
          </span>
        </div>
        <strong>{value}</strong>
        <small>{trend}</small>
        <div className="stat-card__meter" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
