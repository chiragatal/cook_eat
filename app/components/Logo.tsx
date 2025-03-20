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
      <path
        d="M8.5 2C6 2 4 4 4 6.5C4 9 6 11 8.5 11C10 11 11.4 10.2 12.2 9H14V11H17V9H19V6H12.2C11.4 4.8 10 4 8.5 4C7.1 4 6 5.1 6 6.5C6 7.9 7.1 9 8.5 9C9.2 9 9.9 8.6 10.2 8H20V12C20 16.4 16.4 20 12 20C7.6 20 4 16.4 4 12V11.2C3.4 10.8 2.8 10.3 2.4 9.7C2.1 10.4 2 11.2 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12V6H12.2C11.4 4.8 10 4 8.5 4V6.5C8.5 6.8 8.3 7 8 7C7.7 7 7.5 6.8 7.5 6.5C7.5 6.2 7.7 6 8 6C8.4 6 8.8 6.1 9 6.4V4.3C8.8 4.1 8.7 4 8.5 4"
        className="fill-indigo-600 dark:fill-indigo-400"
      />
      <path
        d="M8.5 6C8.2 6 8 6.2 8 6.5C8 6.8 8.2 7 8.5 7C8.8 7 9 6.8 9 6.5C9 6.2 8.8 6 8.5 6Z"
        className="fill-indigo-700 dark:fill-indigo-300"
      />
    </svg>
  );
}
