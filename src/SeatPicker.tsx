import * as stylex from '@stylexjs/stylex';
import { Text } from '@bonterratech/stitch-extension';

const zones = [
  { id: 'vip', label: 'VIP', row: 0 },
  { id: 'floor-l', label: 'Floor Left', row: 1 },
  { id: 'floor-c', label: 'Floor Center', row: 1 },
  { id: 'floor-r', label: 'Floor Right', row: 1 },
  { id: 'balcony-l', label: 'Balcony Left', row: 2 },
  { id: 'balcony-r', label: 'Balcony Right', row: 2 },
] as const;

type ZoneId = (typeof zones)[number]['id'];

interface SeatPickerProps {
  label?: string;
  value: ZoneId | null;
  onChange: (zone: ZoneId) => void;
}

const styles = stylex.create({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  venue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f9',
    border: '1px solid #e6e3e8',
  },
  stage: {
    width: '60%',
    padding: '6px 0',
    textAlign: 'center',
    borderRadius: 20,
    backgroundColor: '#1a191b',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },
  zone: {
    flex: 1,
    padding: '12px 8px',
    borderRadius: 8,
    border: '2px solid #dad7de',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 500,
    color: '#67636a',
    transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
  },
  zoneSelected: {
    borderColor: '#5165fe',
    backgroundColor: '#edefff',
    color: '#5165fe',
    fontWeight: 600,
  },
  zoneHover: {
    ':hover': {
      borderColor: '#aba5b1',
    },
  },
});

export default function SeatPicker({ label, value, onChange }: SeatPickerProps) {
  const rows = [0, 1, 2] as const;

  return (
    <div {...stylex.props(styles.wrapper)}>
      {label && <Text variant="sm" UNSAFE_style={{ fontWeight: 600 }}>{label}</Text>}
      <div
        {...stylex.props(styles.venue)}
        role="radiogroup"
        aria-label={label ?? 'Seat preference'}
      >
        <div {...stylex.props(styles.stage)}>Stage</div>
        {rows.map((row) => (
          <div key={row} {...stylex.props(styles.row)}>
            {zones
              .filter((z) => z.row === row)
              .map((zone) => {
                const selected = value === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(zone.id)}
                    {...stylex.props(
                      styles.zone,
                      !selected && styles.zoneHover,
                      selected && styles.zoneSelected,
                    )}
                  >
                    {zone.label}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { ZoneId, SeatPickerProps };
