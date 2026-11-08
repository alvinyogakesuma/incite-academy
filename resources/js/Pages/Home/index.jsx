import { Head, Link } from '@inertiajs/react';
import { Home as HomeIcon, LogOut } from 'lucide-react';

export default function Home({ auth }) {
    return (
        <>
            <Head title="Home" />

            <div className="font-inter flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4">
                <div className="bg-primary-700/10 flex size-16 items-center justify-center rounded-full">
                    <HomeIcon className="text-primary-700 size-8" />
                </div>

                <div className="text-center">
                    <h1 className="text-heading-xl text-neutral-900">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-body-md text-neutral-500">
                        You are logged in as a student.
                    </p>
                </div>

                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="font-inter text-body-sm hover:text-primary-700 inline-flex cursor-pointer items-center gap-2 text-neutral-500 transition-colors duration-200"
                >
                    <LogOut className="size-4" />
                    Log Out
                </Link>
            </div>
        </>
    );
}
