/**
 * User avatar helpers.
 *
 *  - getInitials     first letters of the (up to) two first words,
 *                    uppercased. Multi-space/leading-space names are
 *                    handled by Array.join's undefined-to-empty
 *                    coercion: the empty word contributes nothing.
 *  - getAvatarStyles deterministic color class: the name's character
 *                    codes sum to a hash, mapped onto the palette.
 *                    Always returns one of the palette entries.
 */
const AVATAR_COLOR_CLASSES = [
    'bg-pink-100 text-pink-700 border-pink-200/50',
    'bg-blue-100 text-blue-700 border-blue-200/50',
    'bg-teal-100 text-teal-700 border-teal-200/50',
    'bg-amber-100 text-amber-700 border-amber-200/50',
    'bg-purple-100 text-purple-700 border-purple-200/50',
    'bg-emerald-100 text-emerald-700 border-emerald-200/50',
    'bg-indigo-100 text-indigo-700 border-indigo-200/50',
];

export const getAvatarStyles = (name) => {
    const hash = name
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
};

export const getInitials = (name) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

export { AVATAR_COLOR_CLASSES };
