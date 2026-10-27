import { Link } from '@inertiajs/react';

import Logomark from '@/components/Logomark';
import Logotype from '@/components/Logotype';

export default function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2">
            <Logomark />
            <Logotype />
        </Link>
    );
}
