import { useEffect } from 'react';
import { Dialog, Form } from 'radix-ui';
import { useForm } from '@inertiajs/react';
import {
    X,
    User,
    Mail,
    ShieldCheck,
    Star,
    Hash,
    GraduationCap,
} from 'lucide-react';
import { z } from 'zod';
import TextField from '@/components/TextField';
import NumberField from '@/components/NumberField';
import SelectField from '@/components/SelectField';
import Button from '@/components/Button';
import zodFieldErrors from '@/utils/zodFieldErrors';

const EMPTY_FORM = {
    name: '',
    email: '',
    role: 'student',
    nim_nip: '',
    major_department: '',
    total_points: 0,
};

const userSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z
        .string()
        .regex(
            /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?itera\.ac\.id$/i,
            'Email must end with @itera.ac.id or its subdomains (e.g. @student.itera.ac.id)',
        ),
    role: z.enum(['student', 'admin']),
    nim_nip: z
        .string()
        .min(1, 'NIM/NIP is required')
        .regex(/^\d+$/, 'NIM/NIP must be a number')
        .max(50, 'NIM/NIP must not exceed 50 characters'),
    major_department: z.string().min(1, 'Department is required'),
    total_points: z.number().int().min(0, 'Points must be a positive number'),
});

export default function UserFormDialog({
    open,
    onOpenChange,
    user,
    onSuccess,
    onError,
    programStudi = [],
    upaUpt = [],
}) {
    const {
        data,
        setData,
        errors,
        setError,
        clearErrors,
        reset,
        post,
        put,
        processing,
    } = useForm(EMPTY_FORM);

    // Hydrate the form when the dialog opens (edit → fill, add → empty).
    // reset/setData come from useForm — stable across renders, so the
    // exhaustive-deps warning is satisfied with a disable comment.
    useEffect(() => {
        if (open) {
            reset();
            if (user) {
                setData({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    nim_nip: user.nim_nip,
                    major_department: user.major_department,
                    total_points: user.total_points,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user]);

    // Per-field validation — validate the touched field, clear or set
    // its error (same pattern as the Login page).
    const handleFieldChange = (field, value) => {
        setData(field, value);

        const result = userSchema.shape[field].safeParse(value);

        if (result.success) {
            clearErrors(field);
        } else {
            setError(field, result.error.issues[0].message);
        }
    };

    const handleSelectChange = (field, value) => {
        handleFieldChange(field, value);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        const result = userSchema.safeParse(data);

        if (!result.success) {
            setError(zodFieldErrors(result.error));
            return;
        }

        const options = {
            onSuccess: () => onSuccess(Boolean(user)),
            onError: () => onError?.(),
        };

        if (user?.id) {
            put(`/dashboard/users/${user.id}`, data, options);
        } else {
            post('/dashboard/users', data, options);
        }
    };

    const isEdit = Boolean(user);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <Dialog.Content className="animate-in fade-in zoom-in-95 fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-2xl duration-200 outline-none md:p-8">
                    <div className="mb-6 flex items-center justify-between border-b border-neutral-950/5 pb-4">
                        <Dialog.Title className="font-poppins text-lg font-bold text-neutral-950">
                            {isEdit ? 'Edit User Information' : 'Add New User'}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors outline-none">
                                <X className="size-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <Form.Root
                        onSubmit={handleFormSubmit}
                        noValidate
                        className="space-y-5"
                    >
                        <TextField
                            name="name"
                            label="Full Name"
                            icon={User}
                            value={data.name}
                            onChange={(e) =>
                                handleFieldChange('name', e.target.value)
                            }
                            placeholder="John Doe"
                            errorMessage={errors.name}
                            required
                        />

                        <TextField
                            name="email"
                            label="Email Address"
                            type="email"
                            icon={Mail}
                            value={data.email}
                            onChange={(e) =>
                                handleFieldChange('email', e.target.value)
                            }
                            placeholder="name@student.itera.ac.id"
                            errorMessage={errors.email}
                            autoComplete="nope"
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                name="role"
                                label="Role"
                                icon={ShieldCheck}
                                value={data.role}
                                onValueChange={(value) =>
                                    handleSelectChange('role', value)
                                }
                                placeholder="Select role"
                                errorMessage={errors.role}
                                options={['student', 'admin']}
                            />

                            <NumberField
                                name="total_points"
                                label="Points"
                                icon={Star}
                                value={data.total_points}
                                onChange={(e) =>
                                    handleFieldChange(
                                        'total_points',
                                        Number(e.target.value),
                                    )
                                }
                                placeholder="0"
                                min="0"
                                errorMessage={errors.total_points}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <TextField
                                name="nim_nip"
                                label="NIM/NIP"
                                icon={Hash}
                                value={data.nim_nip}
                                onChange={(e) =>
                                    handleFieldChange('nim_nip', e.target.value)
                                }
                                placeholder="121140154"
                                errorMessage={errors.nim_nip}
                                required
                            />

                            <SelectField
                                name="major_department"
                                label="Department"
                                icon={GraduationCap}
                                value={data.major_department}
                                onValueChange={(value) =>
                                    handleSelectChange(
                                        'major_department',
                                        value,
                                    )
                                }
                                placeholder="Select department"
                                errorMessage={errors.major_department}
                                groups={[
                                    {
                                        label: 'Program Studi',
                                        options: programStudi,
                                    },
                                    {
                                        label: 'UPA & UPT',
                                        options: upaUpt,
                                    },
                                ]}
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-950/5 pt-4">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="font-inter text-body-sm cursor-pointer rounded-full border border-neutral-950/5 px-4 py-2 font-bold text-neutral-950 transition-colors hover:bg-neutral-50 active:scale-95"
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <Button as="submit" loading={processing}>
                                {isEdit ? 'Update User' : 'Save User'}
                            </Button>
                        </div>
                    </Form.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
