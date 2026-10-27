import Logo from '@/components/Logo';

export default function Footer() {
    return (
        <footer className="bg-blue-50 py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 px-4 text-center sm:px-8">
                <Logo />
                <p className="font-inter text-[13px] text-gray-600">
                    &copy; 2026 INCITE Academy. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
