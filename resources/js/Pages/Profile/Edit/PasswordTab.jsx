import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Form } from 'radix-ui';
import { Key } from 'lucide-react';
import TextField from '@/components/TextField';

/**
 * The change password tab — the current password plus the new one
 * and its confirmation, riding the app's password update endpoint.
 * The success status flashes back to the page toast.
 */
export default function PasswordTab() {
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [errors, setErrors] = useState({});
    const [isChanging, setIsChanging] = useState(false);

    const handleChange = (name, value) => {
        setPasswordData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setIsChanging(true);
        setErrors({});

        router.put('/password', passwordData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsChanging(false);
                setPasswordData({
                    current_password: '',
                    password: '',
                    password_confirmation: '',
                });
            },
            onError: (serverErrors) => {
                setIsChanging(false);
                setErrors(serverErrors ?? {});
            },
        });
    };

    return (
        // Radix Form.Root — the field components render Form.Field,
        // which throws outside one
        <Form.Root onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
                <h2 className="font-poppins text-body-lg flex items-center gap-2 font-bold text-neutral-950">
                    <Key className="size-4" />
                    Change Password
                </h2>
                <p className="font-inter text-body-sm text-neutral-500">
                    Update your account password. You&apos;ll be logged out of
                    other sessions after changing it.
                </p>
            </div>

            <TextField
                name="current_password"
                label="Current Password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) =>
                    handleChange('current_password', e.target.value)
                }
                placeholder="Enter your current password"
                errorMessage={errors.current_password}
                required
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField
                    name="password"
                    label="New Password"
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Enter a new password"
                    errorMessage={errors.password}
                    required
                />

                <TextField
                    name="password_confirmation"
                    label="Confirm New Password"
                    type="password"
                    value={passwordData.password_confirmation}
                    onChange={(e) =>
                        handleChange('password_confirmation', e.target.value)
                    }
                    placeholder="Repeat the new password"
                    errorMessage={errors.password_confirmation}
                    required
                />
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isChanging}
                    className="bg-primary-700 font-inter text-body-sm flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                    <Key className="size-4" />
                    <span>
                        {isChanging
                            ? 'Changing Password...'
                            : 'Change Password'}
                    </span>
                </button>
            </div>
        </Form.Root>
    );
}
