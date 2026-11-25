/**
 * Staff email domain whitelist for the Register form.
 *
 * Dosen/Staff emails are accepted on the bare institutional domain
 * (`itera.ac.id`) or any unit domain. Domains are deduplicated with
 * a Set because several departments share a faculty domain.
 * Falsy domains are filtered out: a null `major_departement_domain`
 * would otherwise survive the Set and crash `emailStaffRule`'s
 * `domain.replace(...)` with a TypeError.
 */
export const staffEmailDomainsFor = (majorDepartements) => [
    ...new Set([
        'itera.ac.id',
        ...majorDepartements
            .map((md) => md.major_departement_domain)
            .filter(Boolean),
    ]),
];
