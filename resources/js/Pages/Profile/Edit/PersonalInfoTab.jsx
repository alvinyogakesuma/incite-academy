import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Form } from 'radix-ui';
import { Save } from 'lucide-react';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SelectField from '@/components/SelectField';
import {
    initialInfoValues,
    infoSubmitValues,
    landingErrorsFor,
} from './profileInfo';

/**
 * The personal info tab — the student's general details and the
 * biography shown on their profile. Saves through the profile
 * update endpoint with the server's errors landing on the fields;
 * the hydration and the PATCH body's program-clearing null live in
 * the covered profileInfo module.
 */
export default function PersonalInfoTab({ majorDepartements = [] }) {
    const { auth } = usePage().props;
    const user = auth?.user ?? {};

    const [formData, setFormData] = useState(initialInfoValues(user));

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleSave = (event) => {
        event.preventDefault();
        setIsSaving(true);
        setErrors({});

        router.patch('/profile', infoSubmitValues(formData), {
            preserveScroll: true,
            onFinish: () => setIsSaving(false),
            onError: (serverErrors) =>
                setErrors(landingErrorsFor(serverErrors)),
        });
    };

    return (
        // Radix Form.Root — the field components render Form.Field,
        // which throws outside one
        <Form.Root onSubmit={handleSave} className="space-y-6">
            <div className="space-y-1">
                <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                    Personal Info
                </h2>
                <p className="font-inter text-body-sm text-neutral-500">
                    Update your general details and the biography visible on
                    your profile.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField
                    name="name"
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    errorMessage={errors.name}
                    required
                />

                <TextField
                    name="nim_nip"
                    label="NIM / NIP"
                    type="text"
                    value={formData.nim_nip ?? ''}
                    onChange={(e) => handleChange('nim_nip', e.target.value)}
                    placeholder="Enter your student NIM"
                    errorMessage={errors.nim_nip}
                />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField
                    name="email"
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="name.1211@student.itera.ac.id"
                    errorMessage={errors.email}
                    required
                />

                <SelectField
                    name="major_departement_id"
                    label="Program Studi"
                    options={majorDepartements}
                    value={formData.major_departement_id}
                    onValueChange={(value) =>
                        handleChange('major_departement_id', value)
                    }
                    placeholder="Select your program"
                    errorMessage={errors.major_departement_id}
                />
            </div>

            <TextAreaField
                name="biography"
                label="Biography"
                value={formData.biography ?? ''}
                onChange={(e) => handleChange('biography', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                errorMessage={errors.biography}
            />

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary-700 font-inter text-body-sm flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                    <Save className="size-4" />
                    <span>
                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                    </span>
                </button>
            </div>
        </Form.Root>
    );
}
