import './MistBackground.css';

export function MistBackground() {
  return (
    <div className="lv2-hero__mist" aria-hidden="true">
      <div className="lv2-hero__mist-layer lv2-hero__mist-layer--base" />
      <div className="lv2-hero__mist-layer lv2-hero__mist-layer--mid" />
      <div className="lv2-hero__mist-layer lv2-hero__mist-layer--front" />
    </div>
  );
}
