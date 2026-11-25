/**
 * Department dropdown options for the Register form.
 *
 * Mahasiswa may only select a study program (a department with a
 * numeric `major_departement_code`); Dosen/Staff may select any
 * unit, including UPA units whose code is null. This filter must
 * stay in agreement with `prodiMahasiswaRefine` in zodRules.js,
 * which validates the selected department against the NIM.
 */
export const majorDepartementOptionsFor = (isMahasiswa, majorDepartements) =>
    isMahasiswa
        ? majorDepartements
              .filter((md) => md.major_departement_code !== null)
              .map((md) => md.name) // mahasiswa: the 42 majors
        : majorDepartements.map((md) => md.name); // dosen/staff: whole list
