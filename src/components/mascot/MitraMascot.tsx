/**
 * The Mitra mascot — the character half of the brand (see MitraMark for the
 * "M", the intelligence half; the two are deliberately separate systems,
 * not interchangeable — see MascotScene's file comment).
 *
 * Built as a simple geometric/vector character (round glasses, dark swept
 * hair, black-and-orange hoodie with the M mark on the chest) rather than a
 * photoreal 3D render, so it matches this app's actual illustration
 * language (soft, rounded, minimal — see the illustrations/ components)
 * and so every `pose` can be a real, cheap, tasteful pose change instead of
 * crossfading between raster frames.
 *
 * One character, many moments: every pose below reuses the same head,
 * hoodie, and proportions — only the arms, small held props, and
 * expression change. Never redesign the character to make a new pose.
 *
 * Poses map to the moments the design brief calls for. The first five are
 * the original set and stay exactly as they were (existing call sites pass
 * `pose="point"` and must keep rendering unchanged):
 *  - 'idle'        default presence, calm
 *  - 'point'       guidance / "let's go" (onboarding, empty states) — aka "helper"
 *  - 'explain'     open hand, mid-thought (general help / guidance)
 *  - 'cheer'       both arms up (success, celebration — used sparingly) — aka "celebrating"
 *  - 'concerned'   unsure (error states) — aka "problem solver"
 *
 * Newer poses, added for specific product moments — see mascotPlacement.ts
 * for which screens use which:
 *  - 'curious'     leaning toward the user's input (campaign creation prompt)
 *  - 'idea'        reacting to something the user just entered
 *  - 'thinking'    AI processing — small orbiting dots, the M stays the lead indicator
 *  - 'creating'    actively assembling a campaign
 *  - 'designer'    holding a pencil — creative direction / poster generation
 *  - 'analyst'     looking at a small chart — analytics, performance
 *  - 'remembering' gathering small connected business objects — Business Brain
 *  - 'discovering' looking through a magnifying glass — insights, recommendations
 */

export type MitraMascotPose =
  | 'idle'
  | 'point'
  | 'explain'
  | 'cheer'
  | 'concerned'
  | 'curious'
  | 'idea'
  | 'thinking'
  | 'creating'
  | 'designer'
  | 'analyst'
  | 'remembering'
  | 'discovering';

const SIZE_MAP = {
  sm: 56,
  md: 88,
  lg: 128,
  xl: 176,
} as const;

export type MitraMascotSize = keyof typeof SIZE_MAP;

interface MitraMascotProps {
  pose?: MitraMascotPose;
  size?: MitraMascotSize;
  className?: string;
  /** Gentle up/down idle drift. Off by default so a scene can drive it deliberately (see MascotScene). */
  animated?: boolean;
  decorative?: boolean;
  ariaLabel?: string;
}

const RAISED_EYEBROWS = 'M60 36 Q66 33 72 36';
const RAISED_EYEBROWS_R = 'M88 36 Q94 33 100 36';
const WORRIED_EYEBROWS = 'M60 38 Q66 42 72 39';
const WORRIED_EYEBROWS_R = 'M88 39 Q94 42 100 38';
/** One brow higher than the other — curiosity / focus, without redrawing the face. */
const ASYMMETRIC_EYEBROWS = 'M60 34 Q66 30 72 34';
const ASYMMETRIC_EYEBROWS_R = 'M88 37 Q94 35 100 37';

function Eyebrows({ pose }: { pose: MitraMascotPose }) {
  const asymmetric = pose === 'curious' || pose === 'analyst' || pose === 'discovering';
  const worried = pose === 'concerned';
  const raised = pose === 'idea';

  const left = worried
    ? WORRIED_EYEBROWS
    : asymmetric
      ? ASYMMETRIC_EYEBROWS
      : raised
        ? 'M60 34 Q66 30 72 34'
        : RAISED_EYEBROWS;
  const right = worried
    ? WORRIED_EYEBROWS_R
    : asymmetric
      ? ASYMMETRIC_EYEBROWS_R
      : raised
        ? 'M88 34 Q94 30 100 34'
        : RAISED_EYEBROWS_R;

  return (
    <>
      <path d={left} stroke="#22242A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d={right} stroke="#22242A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Eyes({ pose }: { pose: MitraMascotPose }) {
  if (pose === 'concerned') {
    return (
      <>
        <circle cx="66" cy="49" r="2.6" fill="#22242A" />
        <circle cx="94" cy="49" r="2.6" fill="#22242A" />
      </>
    );
  }
  if (pose === 'thinking') {
    // pupils drift up and toward center — looking inward, not at the user
    return (
      <>
        <circle cx="68" cy="45" r="3" fill="#22242A" />
        <circle cx="96" cy="45" r="3" fill="#22242A" />
      </>
    );
  }
  if (pose === 'idea') {
    return (
      <>
        <circle cx="66" cy="46" r="3.6" fill="#22242A" />
        <circle cx="94" cy="46" r="3.6" fill="#22242A" />
      </>
    );
  }
  return (
    <>
      <circle cx="66" cy="47" r="3.2" fill="#22242A" />
      <circle cx="94" cy="47" r="3.2" fill="#22242A" />
    </>
  );
}

function Mouth({ pose }: { pose: MitraMascotPose }) {
  if (pose === 'cheer' || pose === 'explain' || pose === 'idea') {
    return (
      <path
        d="M68 60 Q80 70 92 60"
        stroke="#22242A"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (pose === 'concerned') {
    return (
      <path
        d="M70 62 Q80 58 90 62"
        stroke="#22242A"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (pose === 'thinking' || pose === 'analyst' || pose === 'designer') {
    // small, pursed — concentration, not a smile
    return <path d="M73 61 L87 61" stroke="#22242A" strokeWidth="2.4" strokeLinecap="round" />;
  }
  if (pose === 'curious' || pose === 'discovering') {
    return (
      <path
        d="M72 60 Q80 64 88 60"
        stroke="#22242A"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  return (
    <path
      d="M70 60 Q80 65 90 60"
      stroke="#22242A"
      strokeWidth="2.4"
      fill="none"
      strokeLinecap="round"
    />
  );
}

export function MitraMascot({
  pose = 'idle',
  size = 'md',
  className,
  animated = false,
  decorative = true,
  ariaLabel = 'Mitra',
}: MitraMascotProps) {
  const dimension = SIZE_MAP[size];

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 160 160"
      className={`${animated ? 'animate-mascot-idle' : ''} ${className || ''}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : ariaLabel}
    >
      {/* soft ground shadow */}
      <ellipse
        cx="80"
        cy="150"
        rx="34"
        ry="6"
        fill="currentColor"
        className="text-neutral-900/10"
      />

      {/* far arm (behind torso), posed per state */}
      <ArmBack pose={pose} />

      {/* torso: hoodie */}
      <path
        d="M46 108 Q46 78 80 78 Q114 78 114 108 L114 140 Q114 146 108 146 L52 146 Q46 146 46 140 Z"
        fill="#1F2126"
      />
      {/* hoodie hood collar */}
      <path d="M62 82 Q80 70 98 82 L94 92 Q80 84 66 92 Z" fill="#E84D1A" />
      {/* drawstrings */}
      <line
        x1="72"
        y1="90"
        x2="70"
        y2="112"
        stroke="#E84D1A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="88"
        y1="90"
        x2="90"
        y2="112"
        stroke="#E84D1A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* M mark on chest */}
      <path
        d="M84 100 L84 110 L88 106 L92 110 L92 100"
        fill="none"
        stroke="#E84D1A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="97" r="1.8" fill="#E84D1A" />

      {/* near arm (in front of torso), posed per state */}
      <ArmFront pose={pose} />

      {/* small held prop / accessory, per state — never changes the character, only what it's holding or noticing */}
      <PoseProp pose={pose} />

      {/* neck */}
      <rect x="72" y="66" width="16" height="16" rx="6" fill="#F0B088" />

      {/* head */}
      <circle cx="80" cy="46" r="34" fill="#F5C29B" />
      {/* ears */}
      <circle cx="47" cy="48" r="6" fill="#F5C29B" />
      <circle cx="113" cy="48" r="6" fill="#F5C29B" />

      {/* hair */}
      <path
        d="M46 40 Q42 8 80 8 Q118 8 114 40 Q112 24 96 20 Q100 30 90 26 Q92 34 80 28 Q68 34 70 24 Q60 28 62 20 Q48 24 46 40 Z"
        fill="#22242A"
      />

      <Eyebrows pose={pose} />

      {/* glasses */}
      <circle cx="66" cy="47" r="12" fill="none" stroke="#22242A" strokeWidth="2.5" />
      <circle cx="94" cy="47" r="12" fill="none" stroke="#22242A" strokeWidth="2.5" />
      <line x1="78" y1="47" x2="82" y2="47" stroke="#22242A" strokeWidth="2.5" />
      <line
        x1="54"
        y1="45"
        x2="47"
        y2="42"
        stroke="#22242A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="106"
        y1="45"
        x2="113"
        y2="42"
        stroke="#22242A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <Eyes pose={pose} />
      <Mouth pose={pose} />
    </svg>
  );
}

function ArmBack({ pose }: { pose: MitraMascotPose }) {
  if (pose === 'cheer') {
    return (
      <path
        d="M52 100 Q34 78 32 50"
        stroke="#1F2126"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (pose === 'remembering') {
    // both arms ease outward — a gentle "gathering it all in" gesture
    return (
      <path
        d="M52 100 Q30 104 26 124"
        stroke="#1F2126"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <path
      d="M52 100 Q40 112 44 132"
      stroke="#1F2126"
      strokeWidth="16"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function ArmFront({ pose }: { pose: MitraMascotPose }) {
  switch (pose) {
    case 'cheer':
      return (
        <path
          d="M108 100 Q126 78 128 50"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'point':
      return (
        <path
          d="M108 104 Q140 96 152 82"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'explain':
      return (
        <path
          d="M108 104 Q132 100 136 82"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'curious':
      // hand rests thoughtfully near the chin, leaning toward the user's input
      return (
        <path
          d="M108 102 Q118 78 100 66"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'thinking':
      // higher and closer to the temple — mid-thought
      return (
        <path
          d="M108 100 Q122 74 104 58"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'idea':
      // arm lifts as the idea lands
      return (
        <path
          d="M108 100 Q128 84 122 56"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'creating':
      // reaching forward, actively assembling something
      return (
        <path
          d="M108 106 Q132 108 138 122"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'designer':
      // forward and down, as if resting a pencil on a page
      return (
        <path
          d="M108 104 Q134 106 140 118"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'analyst':
      // raised toward a chart at eye level
      return (
        <path
          d="M108 100 Q130 90 128 66"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'remembering':
      return (
        <path
          d="M108 100 Q130 104 134 124"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'discovering':
      // holding a magnifying glass out in front, at chest height
      return (
        <path
          d="M108 102 Q132 96 134 92"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
    default:
      return (
        <path
          d="M108 100 Q120 112 116 132"
          stroke="#1F2126"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

/** A small prop or notice held near the hand/head — the thing that gives the pose its meaning. */
function PoseProp({ pose }: { pose: MitraMascotPose }) {
  switch (pose) {
    case 'thinking':
      // three small dots orbiting above the head — AI processing, secondary to the M mark
      return (
        <g className="animate-mascot-orbit origin-[80px_10px]" aria-hidden="true">
          <circle cx="80" cy="4" r="2.6" fill="#E84D1A" />
          <circle cx="68" cy="10" r="2" fill="#E84D1A" opacity="0.6" />
          <circle cx="92" cy="10" r="2" fill="#E84D1A" opacity="0.6" />
        </g>
      );
    case 'idea':
      return (
        <path
          d="M128 40 L130.4 46.6 L137 49 L130.4 51.4 L128 58 L125.6 51.4 L119 49 L125.6 46.6 Z"
          fill="#E84D1A"
        />
      );
    case 'designer':
      return (
        <g strokeLinecap="round">
          <line x1="140" y1="118" x2="150" y2="108" stroke="#8A6A4E" strokeWidth="4" />
          <line x1="147" y1="111" x2="150" y2="108" stroke="#E84D1A" strokeWidth="4" />
        </g>
      );
    case 'analyst':
      return (
        <g>
          <rect x="126" y="58" width="4" height="8" rx="1" fill="#E84D1A" opacity="0.55" />
          <rect x="132" y="52" width="4" height="14" rx="1" fill="#E84D1A" opacity="0.75" />
          <rect x="138" y="46" width="4" height="20" rx="1" fill="#E84D1A" />
        </g>
      );
    case 'discovering':
      return (
        <g fill="none" strokeLinecap="round">
          <circle cx="138" cy="88" r="7" stroke="#22242A" strokeWidth="2.5" />
          <line x1="143" y1="93" x2="149" y2="99" stroke="#E84D1A" strokeWidth="3" />
        </g>
      );
    case 'remembering':
      return (
        <g fill="none" stroke="#E84D1A" strokeWidth="1.6" opacity="0.85">
          <line x1="70" y1="112" x2="80" y2="120" />
          <line x1="90" y1="112" x2="80" y2="120" />
          <line x1="70" y1="112" x2="90" y2="112" />
          <circle cx="70" cy="112" r="2.2" fill="#E84D1A" stroke="none" />
          <circle cx="90" cy="112" r="2.2" fill="#E84D1A" stroke="none" />
          <circle cx="80" cy="120" r="2.2" fill="#E84D1A" stroke="none" />
        </g>
      );
    case 'creating':
      return (
        <rect
          x="130"
          y="114"
          width="14"
          height="18"
          rx="2"
          fill="var(--color-bg-primary, #fff)"
          stroke="#E84D1A"
          strokeWidth="2"
        />
      );
    default:
      return null;
  }
}
