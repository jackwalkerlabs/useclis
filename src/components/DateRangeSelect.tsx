import { ChevronDown } from 'lucide-react';
import { dateRanges, type DateRange } from '../lib/date-ranges';

export default function DateRangeSelect({ value, onChange, label }: { value: DateRange; onChange: (value: DateRange) => void; label: string }) {
  return <span className="date-range-select">
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value as DateRange)}>
      {dateRanges.map(range => <option key={range.value} value={range.value} disabled={range.value === '24h'}>{range.label}</option>)}
    </select>
    <ChevronDown size={14} aria-hidden="true" />
  </span>;
}
