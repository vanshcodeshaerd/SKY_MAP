import React, { useEffect, useState } from 'react';

export interface CosmicParallaxBgProps {
  /**
   * Main heading text (displayed large in the center)
   */
  head: string;

  /**
   * Subtitle text (displayed below the heading)
   * Comma-separated string that will be split into animated parts
   */
  text: string;

  /**
   * Whether the text animations should loop
   * @default true
   */
  loop?: boolean;

  /**
   * Custom class name for additional styling
   */
  className?: string;

  /**
   * Optional child elements (such as action buttons or introductory cards)
   */
  children?: React.ReactNode;
}

/**
 * A high-performance cosmic parallax background component with animated multi-depth starfield,
 * horizon scattering glow, Earth curvature, and staggered typography animations.
 */
export const CosmicParallaxBg: React.FC<CosmicParallaxBgProps> = ({
  head,
  text,
  loop = true,
  className = '',
  children,
}) => {
  const [smallStars, setSmallStars] = useState<string>('');
  const [mediumStars, setMediumStars] = useState<string>('');
  const [bigStars, setBigStars] = useState<string>('');

  // Split the text by commas and trim whitespace
  const textParts = text.split(',').map((part) => part.trim());

  // Generate random star positions
  const generateStarBoxShadow = (count: number): string => {
    const shadows: string[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * 2000);
      const y = Math.floor(Math.random() * 2000);
      shadows.push(`${x}px ${y}px #FFF`);
    }
    return shadows.join(', ');
  };

  useEffect(() => {
    // Generate star shadows when component mounts (hydration safe)
    setSmallStars(generateStarBoxShadow(700));
    setMediumStars(generateStarBoxShadow(200));
    setBigStars(generateStarBoxShadow(100));

    // Set animation iteration based on loop prop
    document.documentElement.style.setProperty(
      '--animation-iteration',
      loop ? 'infinite' : '1'
    );
  }, [loop]);

  return (
    <div className={`cosmic-parallax-container ${className}`}>
      {/* Stars layers */}
      <div id="stars" style={{ boxShadow: smallStars }} className="cosmic-stars" />
      <div id="stars2" style={{ boxShadow: mediumStars }} className="cosmic-stars-medium" />
      <div id="stars3" style={{ boxShadow: bigStars }} className="cosmic-stars-large" />

      {/* Horizon and Earth */}
      <div id="horizon">
        <div className="glow" />
      </div>
      <div id="earth" />

      {/* Title and subtitle */}
      <div id="title">{head.toUpperCase()}</div>
      <div id="subtitle">
        {textParts.map((part, index) => (
          <React.Fragment key={index}>
            <span className={`subtitle-part-${index + 1}`}>{part.toUpperCase()}</span>
            {index < textParts.length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>

      {/* Interactive Overlaid Content (buttons, welcome actions) */}
      {children && (
        <div className="relative z-20 mt-8 flex flex-col items-center max-w-4xl w-full px-4">
          {children}
        </div>
      )}
    </div>
  );
};
