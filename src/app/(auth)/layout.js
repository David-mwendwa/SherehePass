export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-var(--header-h))] items-center justify-center px-6 py-16">
      <div className="bloom" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
