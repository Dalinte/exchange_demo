export type IconName =
  | 'search'
  | 'star'
  | 'star-filled'
  | 'caret-down'
  | 'reset'
  | 'wallet'
  | 'plus'
  | 'minus'
  | 'check'
  | 'x';

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 14 }: IconProps) {
  const s = size;
  switch (name) {
    case 'search':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="7" cy="7" r="5" />
          <path d="m11 11 3 3" />
        </svg>
      );
    case 'star':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2l-3.6 1.9.7-4L2.2 6.3l4-.6L8 2Z" />
        </svg>
      );
    case 'star-filled':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2l-3.6 1.9.7-4L2.2 6.3l4-.6L8 2Z" />
        </svg>
      );
    case 'caret-down':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 11 3 6h10z" />
        </svg>
      );
    case 'reset':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M3 8a5 5 0 1 1 1.6 3.7" />
          <path d="M3 4v3h3" />
        </svg>
      );
    case 'wallet':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="2" y="4" width="12" height="9" rx="1.5" />
          <path d="M2 7h12" />
          <circle cx="11" cy="10" r=".8" fill="currentColor" />
        </svg>
      );
    case 'plus':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
      );
    case 'minus':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 8h10" />
        </svg>
      );
    case 'check':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m3 8 3.5 3.5L13 5" />
        </svg>
      );
    case 'x':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      );
    default:
      return null;
  }
}
