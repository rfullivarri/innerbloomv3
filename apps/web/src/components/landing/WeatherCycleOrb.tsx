export default function WeatherCycleOrb() {
  return (
    <div className="weather-cycle-orb weather-cycle-orb--static weather-cycle-orb--ib20" aria-hidden>
      <div className="weather-cycle-orb__system">
        <span className="weather-cycle-orb__flower" />
        <span className="weather-cycle-orb__track weather-cycle-orb__track--rigid" />
        <span className="weather-cycle-orb__track weather-cycle-orb__track--adaptive" />
        <span className="weather-cycle-orb__node weather-cycle-orb__node--one" />
        <span className="weather-cycle-orb__node weather-cycle-orb__node--two" />
        <span className="weather-cycle-orb__node weather-cycle-orb__node--three" />
        <span className="weather-cycle-orb__pulse weather-cycle-orb__pulse--one" />
        <span className="weather-cycle-orb__pulse weather-cycle-orb__pulse--two" />
        <span className="weather-cycle-orb__panel weather-cycle-orb__panel--left" />
        <span className="weather-cycle-orb__panel weather-cycle-orb__panel--right" />
      </div>
    </div>
  );
}
