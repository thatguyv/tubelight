import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-6xl font-bold brand-text">404</h1>
      <p className="mt-3 text-base text-muted-foreground">
        We couldn&apos;t find that page.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
