import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form as RadixForm } from 'radix-ui';
import AdminLayout from '@/layout/AdminLayout';
import AdminForm from '@/components/AdminForm';
import AdminLeftPanelContainer from '@/components/AdminLeftPanelContainer';
import AdminRightPanelContainer from '@/components/AdminRightPanelContainer';
import ConditionsBuilder from '@/components/ConditionsBuilder';
import AvatarInformation from './AvatarInformation';
import buildAvatarFormData, {
    initialAvatarValues,
} from './buildAvatarFormData';
import { buildAvatarSchema } from './avatarSchema';

/**
 * Avatar editor page. The whole avatar — its metadata, its
 * optional icon, and its unlock requirements — lives in one
 * react-hook-form: the conditions are a field array whose order
 * rides the whole-payload save, and the Save Avatar button
 * validates the payload before PUTting the multipart body to the
 * server. Built on the badge editor's architecture, sharing its
 * conditions builder.
 */
export default function Editor({
    avatar,
    availableCourses = [],
    availablePaths = [],
    availableChallenges = [],
}) {
    const [isSaving, setIsSaving] = useState(false);

    const avatarSchema = useMemo(() => buildAvatarSchema(), []);

    const {
        control,
        handleSubmit,
        setValue,
        clearErrors,
        setError,
        formState: { errors },
    } = useForm({
        resolver: (values, context, options) =>
            zodResolver(avatarSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: initialAvatarValues(avatar),
    });

    // The PUT rides as a POST (method spoofing) — the FormData
    // carries the condition rows and any fresh files, and the
    // server's error keys land straight back on the form fields.
    const onValid = (values) => {
        if (isSaving) {
            return;
        }

        router.post(
            `/dashboard/avatars/${avatar.id}`,
            buildAvatarFormData(values),
            {
                onStart: () => setIsSaving(true),
                onFinish: () => setIsSaving(false),
                onError: (serverErrors) => {
                    clearErrors();

                    for (const [path, message] of Object.entries(
                        serverErrors ?? {},
                    )) {
                        setError(path, { type: 'server', message });
                    }
                },
            },
        );
    };

    return (
        // Radix Form.Root — the field components render Form.Field,
        // which throws outside one
        <RadixForm.Root className="space-y-8">
            <AdminForm
                title="Avatar"
                backTarget="Avatars"
                backUrl="/dashboard/avatars"
                onSave={handleSubmit(onValid)}
                isSaving={isSaving}
            >
                <AdminLeftPanelContainer>
                    <AvatarInformation
                        control={control}
                        errors={errors}
                        avatar={avatar}
                        setValue={setValue}
                    />
                </AdminLeftPanelContainer>

                <AdminRightPanelContainer>
                    <ConditionsBuilder
                        control={control}
                        errors={errors}
                        setValue={setValue}
                        heading="Avatar Earning Conditions"
                        availableCourses={availableCourses}
                        availablePaths={availablePaths}
                        availableChallenges={availableChallenges}
                    />
                </AdminRightPanelContainer>
            </AdminForm>
        </RadixForm.Root>
    );
}

Editor.layout = (page) => <AdminLayout>{page}</AdminLayout>;
