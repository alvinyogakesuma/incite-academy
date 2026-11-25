import { useEffect, useMemo, useState } from 'react';
import { Dialog, Form } from 'radix-ui';
import { router } from '@inertiajs/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    X,
    User,
    Mail,
    ShieldCheck,
    Star,
    Hash,
    GraduationCap,
} from 'lucide-react';
import TextField from '@/components/TextField';
import EmailField from '@/components/EmailField';
import NumberField from '@/components/NumberField';
import SelectField from '@/components/SelectField';
import Button from '@/components/Button';
import { majorDepartementOptionsFor } from '@/Pages/Auth/Register/majorDepartementOptions';
import { staffEmailDomainsFor } from '@/Pages/Auth/Register/staffEmailDomains';
import { shouldResetIdentityFields } from '@/Pages/Auth/Register/resetIdentityFields';
import {
    EMPTY_FORM,
    initialFormValues,
    buildUserSchema,
    submitUserRequest,
    mapServerErrors,
    dialogCopy,
    coercePointsInput,
} from './userForm';

export default function UserFormDialog({
    open,
    onOpenChange,
    user,
    onSuccess,
    onError,
    majorDepartements = [],
}) {
    const [isPending, setIsPending] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        trigger,
        getValues,
        reset,
        resetField,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm({
        resolver: (values, context, options) =>
            zodResolver(userSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: EMPTY_FORM,
    });

    // Hydrate the form when the dialog opens (edit → fill, add → empty).
    useEffect(() => {
        if (!open) {
            return;
        }

        reset(initialFormValues(user));
    }, [open, user, reset]);

    // ── Academic status drives the validation rule set ─────────
    const isMahasiswa = watch('academic_status') === 'Mahasiswa';

    // Dropdown options for the current status (same split as Register):
    // mahasiswa → the program studi list, dosen/staff → the whole list.
    const majorDepartementOptions = useMemo(
        () => majorDepartementOptionsFor(isMahasiswa, majorDepartements),
        [isMahasiswa, majorDepartements],
    );

    const staffEmailDomains = useMemo(
        () => staffEmailDomainsFor(majorDepartements),
        [majorDepartements],
    );

    // Validation schema — composed from the shared rules exactly like
    // the Register page (minus the password fields, which this dialog
    // does not manage).
    const userSchema = useMemo(
        () =>
            buildUserSchema({
                isMahasiswa,
                staffEmailDomains,
                majorDepartementOptions,
                majorDepartements,
            }),
        [
            isMahasiswa,
            staffEmailDomains,
            majorDepartementOptions,
            majorDepartements,
        ],
    );

    // Re-validate email after academic_status switches once userSchema updates.
    useEffect(() => {
        if (getValues('email')) {
            trigger('email');
        }
    }, [isMahasiswa, getValues, trigger]);

    // Switching between Mahasiswa and a staff status swaps the NIM/NIP
    // and department rule sets, so both fields reset (Register parity).
    const handleStatusChange = (value, onChange) => {
        const previousStatus = getValues('academic_status');

        onChange(value);

        if (shouldResetIdentityFields(previousStatus, value)) {
            resetField('nim_nip', { defaultValue: '' });
            resetField('major_department', { defaultValue: '' });
        }
    };

    const onValid = (values) => {
        if (isPending) {
            return;
        }

        const options = {
            onStart: () => setIsPending(true),
            onFinish: () => setIsPending(false),
            onSuccess: () => onSuccess(Boolean(user)),
            onError: (serverErrors) => {
                clearErrors();
                for (const [field, message] of mapServerErrors(serverErrors)) {
                    setError(field, { type: 'server', message });
                }
                onError?.();
            },
        };

        const request = submitUserRequest(user);
        router[request.method](request.url, values, options);
    };

    const { title, submitLabel } = dialogCopy(Boolean(user));

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <Dialog.Content className="animate-in fade-in zoom-in-95 fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-2xl duration-200 outline-none md:p-8">
                    <div className="mb-6 flex items-center justify-between border-b border-neutral-950/5 pb-4">
                        <Dialog.Title className="font-poppins text-lg font-bold text-neutral-950">
                            {title}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors outline-none">
                                <X className="size-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <Form.Root
                        onSubmit={handleSubmit(onValid)}
                        noValidate
                        className="space-y-5"
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    name={field.name}
                                    label="Full Name"
                                    icon={User}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    placeholder="John Doe"
                                    errorMessage={errors.name?.message}
                                    required
                                />
                            )}
                        />

                        <Controller
                            name="academic_status"
                            control={control}
                            render={({ field }) => (
                                <SelectField
                                    name={field.name}
                                    label="Status Akademik"
                                    options={['Mahasiswa', 'Dosen', 'Staff']}
                                    icon={GraduationCap}
                                    value={field.value}
                                    errorMessage={
                                        errors.academic_status?.message
                                    }
                                    autoComplete="off"
                                    onValueChange={(value) =>
                                        handleStatusChange(
                                            value,
                                            field.onChange,
                                        )
                                    }
                                    required
                                />
                            )}
                        />

                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <EmailField
                                    name={field.name}
                                    label="Email Address"
                                    type="email"
                                    icon={Mail}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    placeholder="alvin.121140154@student.itera.ac.id"
                                    errorMessage={errors.email?.message}
                                    autoComplete="email"
                                    required
                                />
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="role"
                                control={control}
                                render={({ field }) => (
                                    <SelectField
                                        name={field.name}
                                        label="Role"
                                        icon={ShieldCheck}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select role"
                                        errorMessage={errors.role?.message}
                                        options={['student', 'admin']}
                                    />
                                )}
                            />

                            <Controller
                                name="total_points"
                                control={control}
                                render={({ field }) => (
                                    <NumberField
                                        name={field.name}
                                        label="Points"
                                        icon={Star}
                                        value={field.value}
                                        onChange={(e) =>
                                            field.onChange(
                                                coercePointsInput(
                                                    e.target.value,
                                                ),
                                            )
                                        }
                                        onBlur={field.onBlur}
                                        placeholder="0"
                                        min="0"
                                        errorMessage={
                                            errors.total_points?.message
                                        }
                                    />
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="nim_nip"
                                control={control}
                                render={({ field }) => (
                                    <NumberField
                                        name={field.name}
                                        label={isMahasiswa ? 'NIM' : 'NIP'}
                                        type="number"
                                        icon={Hash}
                                        value={field.value}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        placeholder={
                                            isMahasiswa
                                                ? '121140154'
                                                : '198504122010011001'
                                        }
                                        errorMessage={errors.nim_nip?.message}
                                        required
                                    />
                                )}
                            />

                            <Controller
                                name="major_department"
                                control={control}
                                render={({ field }) => (
                                    <SelectField
                                        name={field.name}
                                        label={
                                            isMahasiswa
                                                ? 'Program Studi'
                                                : 'Program Studi / UPA'
                                        }
                                        icon={GraduationCap}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder={
                                            isMahasiswa
                                                ? 'Teknik Informatika'
                                                : 'UPA TIK / Teknik Informatika'
                                        }
                                        errorMessage={
                                            errors.major_department?.message
                                        }
                                        options={majorDepartementOptions}
                                    />
                                )}
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
                            <Button as="submit" loading={isPending}>
                                {submitLabel}
                            </Button>
                        </div>
                    </Form.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
