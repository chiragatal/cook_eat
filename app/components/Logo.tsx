export default function Logo({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chef Hat */}
      <path
        d="M7 6C7 4.34 8.34 3 10 3C10.73 3 11.41 3.19 12 3.5C12.59 3.19 13.27 3 14 3C15.66 3 17 4.34 17 6C17 7.13 16.36 8.16 15.5 8.7V10.5H8.5V8.7C7.64 8.15 7 7.13 7 6Z"
        className="fill-indigo-600 dark:fill-indigo-400"
      />

      {/* Plate - outer circle */}
      <path
        d="M20 14C20 11.79 18.21 10 16 10H8C5.79 10 4 11.79 4 14C4 16.21 5.79 18 8 18H16C18.21 18 20 16.21 20 14Z"
        className="fill-indigo-100 dark:fill-indigo-900 stroke-indigo-400 dark:stroke-indigo-500"
        strokeWidth="1.5"
        stroke="currentColor"
      />

      {/* Plate rim */}
      <path
        d="M19 14C19 15.66 17.66 17 16 17H8C6.34 17 5 15.66 5 14C5 12.34 6.34 11 8 11H16C17.66 11 19 12.34 19 14Z"
        className="fill-indigo-50 dark:fill-indigo-800"
      />

      {/* Food items */}
      <path
        d="M15 13C15.5523 13 16 13.4477 16 14C16 14.5523 15.5523 15 15 15C14.4477 15 14 14.5523 14 14C14 13.4477 14.4477 13 15 13Z"
        className="fill-indigo-300 dark:fill-indigo-300"
      />
      <path
        d="M11 12C11.5523 12 12 12.4477 12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12Z"
        className="fill-indigo-500 dark:fill-indigo-400"
      />
      <path
        d="M9 14C9.55228 14 10 14.4477 10 15C10 15.5523 9.55228 16 9 16C8.44772 16 8 15.5523 8 15C8 14.4477 8.44772 14 9 14Z"
        className="fill-indigo-400 dark:fill-indigo-300"
      />
      <path
        d="M12 15C12.5523 15 13 15.4477 13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15Z"
        className="fill-indigo-300 dark:fill-indigo-200"
      />

      {/* Plate base/stand */}
      <path
        d="M14 18H10C10 18 9 19 12 20C15 19 14 18 14 18Z"
        className="fill-indigo-200 dark:fill-indigo-700"
      />

      {/* Steam */}
      <path
        d="M10 9C10 9 9.5 8 10.5 7.5"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        className="stroke-indigo-400 dark:stroke-indigo-300"
      />
      <path
        d="M12 9C12 9 11.5 7.5 12.5 7"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        className="stroke-indigo-400 dark:stroke-indigo-300"
      />
      <path
        d="M14 9C14 9 13.5 8 14.5 7.5"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        className="stroke-indigo-400 dark:stroke-indigo-300"
      />
    </svg>
  );
}
