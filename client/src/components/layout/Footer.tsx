import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border py-6 lg:ml-64">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="flex items-center justify-center md:justify-start">
              <span className="text-primary font-bold text-xl">
                ANI<span className="text-purple-400">DAO</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mt-2 text-center md:text-left">
              Anime streaming platform
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end gap-4">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground text-sm">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground text-sm">
              Privacy Policy
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground text-sm">
              Contact
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground text-sm">
              About
            </Link>
          </div>
        </div>
        
        <div className="mt-6 text-center text-muted-foreground text-xs">
          <p>© {new Date().getFullYear()} ANI DAO. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
