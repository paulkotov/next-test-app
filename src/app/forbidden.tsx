import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        403
      </p>
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        You do not have access to this page.
      </h1>
      <Link
        href="/"
        className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
      >
        Go back
      </Link>
    </main>
  );
}
