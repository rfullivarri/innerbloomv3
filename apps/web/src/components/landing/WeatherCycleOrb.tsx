import { useEffect, useMemo, useState } from 'react';

type WeatherState = {
  key: 'clear-day' | 'overcast-day' | 'rain' | 'clear-night';
  label: string;
};

const WEATHER_STATES: WeatherState[] = [
  { key: 'clear-day', label: 'Día soleado' },
  { key: 'overcast-day', label: 'Día nublado' },
  { key: 'rain', label: 'Lluvia' },
  { key: 'clear-night', label: 'Noche' },
];

const CYCLE_MS = 4000;

export default function WeatherCycleOrb() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WEATHER_STATES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const current = useMemo(() => WEATHER_STATES[index], [index]);

  return (
    <div className={`weather-cycle-orb weather-cycle-orb--${current.key}`} aria-hidden>
      <div className="weather-cycle-orb__ambient" />
      <div className="weather-cycle-orb__horizon" />

      <div className="weather-cycle-orb__icon-layer" role="presentation" aria-label={current.label}>
        <div className="weather-icon weather-icon--sun" />
        <div className="weather-icon weather-icon--cloud weather-icon--cloud-main" />
        <div className="weather-icon weather-icon--cloud weather-icon--cloud-soft" />
        <div className="weather-icon weather-icon--rain" />
        <div className="weather-icon weather-icon--moon" />
        <div className="weather-icon weather-icon--stars" />
      </div>
    </div>
  );
}
