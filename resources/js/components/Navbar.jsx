import Button from '@/components/Button';
import Logo from '@/components/Logo';

export default function Navbar() {
    return (
        <header className="sticky top-0 z-999 bg-neutral-50/90 py-4 shadow-md backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-8">
                <Logo />
                <nav className="flex items-center gap-3">
                    <Button href="/login">Login</Button>
                    <Button href="/register" variant="outline">
                        Sign Up
                    </Button>
                </nav>
            </div>
        </header>
    );
}
