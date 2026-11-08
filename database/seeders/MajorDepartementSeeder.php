<?php

namespace Database\Seeders;

use App\Models\MajorDepartement;
use Illuminate\Database\Seeder;

class MajorDepartementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $majorDepartements = [
            // [name, domain, code]
            ['Fisika', 'fi.itera.ac.id', 11],
            ['Magister Fisika', 'mfi.itera.ac.id', 11],
            ['Teknik Geofisika', 'tg.itera.ac.id', 12],
            ['Teknik Elektro', 'el.itera.ac.id', 13],
            ['Teknik Informatika', 'if.itera.ac.id', 14],
            ['Teknik Geologi', 'gl.itera.ac.id', 15],
            ['Matematika', 'ma.itera.ac.id', 16],
            ['Teknik Mesin', 'ms.itera.ac.id', 17],
            ['Biologi', 'bi.itera.ac.id', 18],
            ['Teknik Industri', 'ti.itera.ac.id', 19],
            ['Teknik Sipil', 'si.itera.ac.id', 21],
            ['Perencanaan Wilayah dan Kota', 'pwk.itera.ac.id', 22],
            ['Teknik Geomatika', 'gt.itera.ac.id', 23],
            ['Arsitektur', 'ar.itera.ac.id', 24],
            ['Teknik Lingkungan', 'tl.itera.ac.id', 25],
            ['Farmasi', 'fa.itera.ac.id', 26],
            ['Kimia', 'ki.itera.ac.id', 27],
            ['Teknik Kimia', 'tk.itera.ac.id', 28],
            ['Atmosfer dan Keplanetan', 'sap.itera.ac.id', 29],
            ['Teknik Kelautan', 'kl.itera.ac.id', 30],
            ['Teknik Biosistem', 'tbs.itera.ac.id', 31],
            ['Teknik Fisika', 'tf.itera.ac.id', 32],
            ['Teknologi Industri Pertanian', 'tip.itera.ac.id', 33],
            ['Teknik Sistem Energi', 'tse.itera.ac.id', 34],
            ['Teknologi Pangan', 'tp.itera.ac.id', 35],
            ['Teknik Material', 'mt.itera.ac.id', 36],
            ['Teknik Pertambangan', 'ta.itera.ac.id', 37],
            ['Desain Komunikasi Visual', 'dkv.itera.ac.id', 38],
            ['Arsitektur Lanskap', 'arl.itera.ac.id', 39],
            ['Teknik Telekomunikasi', 'tt.itera.ac.id', 40],
            ['Sains Aktuaria', 'at.itera.ac.id', 41],
            ['Rekayasa Kehutanan', 'rh.itera.ac.id', 42],
            ['Teknik Biomedik', 'bm.itera.ac.id', 43],
            ['Sains Lingkungan Kelautan', 'sll.itera.ac.id', 44],
            ['Sains Data', 'sd.itera.ac.id', 45],
            ['Teknik Perkeretaapian', 'ka.itera.ac.id', 46],
            ['Rekayasa Tata Kelola Air Terpadu', 'tka.itera.ac.id', 47],
            ['Rekayasa Minyak dan Gas', 'rmg.itera.ac.id', 48],
            ['Rekayasa Instrumentasi dan Automasi', 'ia.itera.ac.id', 49],
            ['Rekayasa Kosmetik', 'kos.itera.ac.id', 50],
            ['Teknik Rekayasa Keolahragaan', 'ro.itera.ac.id', 51],
            ['Pariwisata', 'pariwisata.itera.ac.id', 52],
            ['UPA TIK', 'itera.ac.id', null],
            ['UPA Bahasa', 'itera.ac.id', null],
            ['UPA Perpustakaan', 'itera.ac.id', null],
            ['UPA KFS', 'itera.ac.id', null],
            ['UPA Laboratorium Terpadu', 'itera.ac.id', null],
        ];

        foreach ($majorDepartements as [$name, $domain, $code]) {
            MajorDepartement::query()->firstOrCreate(
                ['name' => $name],
                [
                    'major_departement_domain' => $domain,
                    'major_departement_code' => $code,
                ],
            );
        }
    }
}
