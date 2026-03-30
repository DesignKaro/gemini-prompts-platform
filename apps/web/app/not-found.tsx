import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container-reading">
        <div className="rounded-[22px] border border-[#e1e5ee] bg-[#f8fafc] p-8 text-center">
          <p className="text-[0.82rem] font-medium uppercase tracking-[0.08em] text-[#6b7280]">
            404
          </p>
          <h1 className="mt-3 text-[2rem] leading-[1.1] tracking-[-0.03em] text-[#111118]">
            Page not found
          </h1>
          <p className="mt-3 text-[1rem] text-[#5f6773]">
            The page you requested does not exist or may have moved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-black"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
