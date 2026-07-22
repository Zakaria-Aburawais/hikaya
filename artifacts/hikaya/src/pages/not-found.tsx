import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="font-display text-7xl font-bold gold-text">404</div>
      <p className="mt-3 text-white/65">This page wandered off into another story.</p>
      <Link to="/">
        <Button className="mt-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90">
          Take me home
        </Button>
      </Link>
    </div>
  );
}
