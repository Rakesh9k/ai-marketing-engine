'use client';

interface AnimatedConnectorProps {
  className?: string;
  variant?: 'curved' | 'horizontal' | 'vertical' | 'loop';
}

export function AnimatedConnector({
  className = '',
  variant = 'curved',
}: AnimatedConnectorProps) {
  if (variant === 'horizontal') {
    return (
      <svg
        className={`w-full h-6 pointer-events-none ${className}`}
        viewBox="0 0 300 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 0 12 L 300 12"
          stroke="#E84D1A"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          className="animate-[dash_20s_linear_infinite]"
        />
        <circle cx="150" cy="12" r="3" fill="#E84D1A" className="animate-ping opacity-75" />
      </svg>
    );
  }

  if (variant === 'loop') {
    return (
      <svg
        className={`w-32 h-32 pointer-events-none ${className}`}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="60"
          cy="60"
          r="48"
          stroke="#E84D1A"
          strokeWidth="1.5"
          strokeDasharray="8 8"
          opacity="0.4"
          className="animate-[spin_12s_linear_infinite]"
        />
        <circle cx="60" cy="12" r="3" fill="#E84D1A" />
      </svg>
    );
  }

  return (
    <svg
      className={`w-full h-24 pointer-events-none ${className}`}
      viewBox="0 0 400 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 20 20 Q 200 90 380 20"
        stroke="#E84D1A"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        opacity="0.5"
      />
      <circle cx="200" cy="55" r="3" fill="#E84D1A" className="animate-pulse" />
    </svg>
  );
}
