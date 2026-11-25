export default function Logotype({ tone = 'light' }) {
    const isDark = tone === 'dark';

    return (
        <p
            className={`font-poppins text-body-sm leading-none font-bold whitespace-nowrap ${
                isDark ? 'text-white' : 'text-neutral-950'
            }`}
        >
            INCITE{' '}
            <span className={isDark ? 'text-primary-300' : 'text-primary-700'}>
                ACADEMY
            </span>
        </p>
    );
}
