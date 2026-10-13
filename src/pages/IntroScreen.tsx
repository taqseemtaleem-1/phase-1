import { useEffect, useState } from 'react';
import logoImg from '../assets/taqseem-logo.png';
import whiteImg from '../assets/taqseem-white.png';

interface IntroScreenProps {
  onFinish: () => void;
}

/* ── Soft decorative blobs (fixed positions, no assets needed) ─ */
const BLOBS = [
  { top: '-10%', left: '-8%',  size: 260, color: 'rgba(147,197,253,0.35)' },
  { top: '68%',  left: '-6%',  size: 220, color: 'rgba(190,242,100,0.25)' },
  { top: '-6%',  left: '70%',  size: 240, color: 'rgba(190,242,100,0.22)' },
  { top: '72%',  left: '72%',  size: 260, color: 'rgba(147,197,253,0.3)' },
];

/* ── Twinkling stars, fixed positions ─────────────────────────── */
const STARS = [
  { top: '14%', left: '18%', size: 14, delay: 0.2 },
  { top: '22%', left: '80%', size: 10, delay: 1.1 },
  { top: '78%', left: '20%', size: 12, delay: 0.6 },
  { top: '82%', left: '78%', size: 16, delay: 1.6 },
  { top: '10%', left: '50%', size: 9,  delay: 2.0 },
];

const CSS = `
  .intro-bg {
    background: radial-gradient(ellipse at 50% 0%,
      #bfdbfe 0%, #dbeafe 40%, #e0f2fe 70%, #f0f9ff 100%);
  }

  @keyframes blobFloat {
    0%,100% { transform: translateY(0) scale(1); }
    50%     { transform: translateY(-14px) scale(1.04); }
  }

  @keyframes starTwinkle {
    0%,100% { opacity: 0.15; transform: scale(0.8); }
    50%     { opacity: 0.9;  transform: scale(1.15); }
  }

  @keyframes logoPop {
    0%   { opacity: 0; transform: scale(0.4) rotate(-8deg); }
    60%  { opacity: 1; transform: scale(1.08) rotate(3deg); }
    80%  { transform: scale(0.96) rotate(-1deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  @keyframes ringPulse {
    0%   { opacity: 0.55; transform: scale(1); }
    100% { opacity: 0;    transform: scale(1.6); }
  }

  @keyframes badgeIn {
    0%   { opacity: 0; transform: translateY(14px) scale(0.9); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes titleIn {
    0%   { opacity: 0; transform: translateY(18px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes crossOutGreen {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.7); }
  }

  @keyframes crossInWhite {
    0%   { opacity: 0; transform: scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes whiteFloat {
    0%,100% { transform: translateY(0);    }
    50%      { transform: translateY(-8px); }
  }

  @keyframes textOut {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-8px); }
  }

  @keyframes screenExit {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.06); }
  }

  .intro-blob        { position: absolute; border-radius: 50%; filter: blur(30px); animation: blobFloat 7s ease-in-out infinite; }
  .intro-star        { position: absolute; animation: starTwinkle 2.6s ease-in-out infinite; }
  .intro-logo-pop    { animation: logoPop 0.7s cubic-bezier(.34,1.56,.64,1) both; }
  .intro-ring        { animation: ringPulse 1.8s ease-out infinite; }
  .intro-badge-in    { animation: badgeIn 0.5s ease-out 0.5s both; }
  .intro-title-in    { animation: titleIn 0.5s ease-out 0.7s both; }
  .intro-green-out   { animation: crossOutGreen 0.5s ease-in forwards; }
  .intro-white-in    { animation: crossInWhite 0.6s cubic-bezier(.34,1.2,.64,1) 0.1s both, whiteFloat 2.4s ease-in-out 0.7s infinite; }
  .intro-text-out    { animation: textOut 0.4s ease-in forwards; }
  .intro-screen-exit { animation: screenExit 0.6s ease-in forwards; }
`;

function Star({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="#facc15" className="intro-star" style={style}>
      <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" />
    </svg>
  );
}

// Phases: enter (green logo + text) → swap (cross-fade to white logo) → exit (fade out) → done
type Phase = 'enter' | 'swap' | 'exit' | 'done';

export default function IntroScreen({ onFinish }: IntroScreenProps) {
  const [phase, setPhase] = useState<Phase>('enter');

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase('swap'), 2200));
    t.push(setTimeout(() => setPhase('exit'), 3800));
    t.push(setTimeout(() => { setPhase('done'); onFinish(); }, 4500));
    return () => t.forEach(clearTimeout);
  }, [onFinish]);

  if (phase === 'done') return null;

  const showGreen = phase === 'enter';
  const showWhite = phase === 'swap' || phase === 'exit';

  return (
    <>
      <style>{CSS}</style>

      <div
        className={`intro-bg${phase === 'exit' ? ' intro-screen-exit' : ''}`}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          fontFamily: '"Fredoka", system-ui, sans-serif',
        }}
      >
        {/* Soft decorative blobs */}
        {BLOBS.map((b, i) => (
          <div key={i} className="intro-blob" style={{
            top: b.top, left: b.left, width: b.size, height: b.size,
            background: b.color, animationDelay: `${i * 0.6}s`,
          }} />
        ))}

        {/* Twinkling stars */}
        {STARS.map((s, i) => (
          <Star key={i} style={{
            top: s.top, left: s.left, width: s.size, height: s.size,
            animationDelay: `${s.delay}s`,
          }} />
        ))}

        {/* Center content */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 22,
        }}>

          {/* Logo stage: green circle logo cross-fades into white glow logo */}
          <div style={{ position: 'relative', width: 190, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {showGreen && (
              <>
                <span className="intro-ring" style={{
                  position: 'absolute', width: 170, height: 170, borderRadius: '50%',
                  border: '3px solid rgba(120,172,46,0.55)',
                }} />
                <img
                  src={logoImg}
                  alt="Taqseem"
                  className="intro-logo-pop"
                  style={{
                    position: 'absolute',
                    width: 170, height: 170,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: '0 8px 0 0 rgba(90,130,30,0.35), 0 14px 40px -8px rgba(0,0,0,0.25)',
                    border: '5px solid white',
                  }}
                />
              </>
            )}

            {showWhite && (
              <img
                src={whiteImg}
                alt="Taqseem Foundation"
                className="intro-white-in"
                style={{
                  position: 'absolute',
                  width: 200, height: 200,
                  objectFit: 'contain',
                  filter: [
                    'drop-shadow(0 0 20px rgba(120,172,46,0.55))',
                    'drop-shadow(0 0 46px rgba(147,197,253,0.6))',
                    'drop-shadow(0 4px 14px rgba(0,0,0,0.18))',
                  ].join(' '),
                }}
              />
            )}
          </div>

          {/* "Powered by" badge — enter phase only */}
          {showGreen && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="intro-badge-in" style={{
                display: 'inline-block',
                background: '#facc15',
                borderRadius: 999,
                padding: '4px 18px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#7a5b00',
              }}>
                Powered by
              </div>
              <div className="intro-title-in" style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#1e3a8a',
                letterSpacing: '-0.01em',
                marginTop: 6,
                textShadow: '0 2px 0 rgba(255,255,255,0.8)',
              }}>
                Taqseem Foundation
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
