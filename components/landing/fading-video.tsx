/**
 * Hero background video — autoplay, muted, native loop (no fade).
 */

interface FadingVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FadingVideo({ src, className, style }: FadingVideoProps) {
  return (
    <video
      src={src}
      autoPlay
      muted
      playsInline
      loop
      preload="auto"
      className={className}
      style={style}
    />
  );
}
