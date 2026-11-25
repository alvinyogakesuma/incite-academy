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
import BadgeInformation from './BadgeInformation';
import buildBadgeFormData, { initialBadgeValues } from './buildBadgeFormData';
import { buildBadgeSchema } from './badgeSchema';

/**
 * Badge editor page. The whole badge — its metadata, its optional
 * icon, and its earning requirements — lives in one
 * react-hook-form: the conditions are a field array whose order
 * rides the whole-payload save, and the Save Badge button
 * validates the payload before PUTting the multipart body to the
 * server. Built on the other editors' architecture.
 */
export default function Editor({
    badge,
    availableCourses = [],
    availablePaths = [],
    availableChallenges = [],
}) {
    const [isSaving, setIsSaving] = useState(false);

    const badgeSchema = useMemo(() => buildBadgeSchema(), []);

    const {
        control,
        handleSubmit,
        setValue,
        clearErrors,
        setError,
        formState: { errors },
    } = useForm({
        resolver: (values, context, options) =>
            zodResolver(badgeSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: initialBadgeValues(badge),
    });

    // The PUT rides as a POST (method spoofing) — the FormData
    // carries the condition rows and any fresh files, and the
    // server's error keys land straight back on the form fields.
    const onValid = (values) => {
        if (isSaving) {
            return;
        }

        router.post(
            `/dashboard/badges/${badge.id}`,
            buildBadgeFormData(values),
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
                title="Badge"
                backTarget="Badges"
                backUrl="/dashboard/badges"
                onSave={handleSubmit(onValid)}
                isSaving={isSaving}
            >
                <AdminLeftPanelContainer>
                    <BadgeInformation
                        control={control}
                        errors={errors}
                        badge={badge}
                        setValue={setValue}
                    />
                </AdminLeftPanelContainer>

                <AdminRightPanelContainer>
                    <ConditionsBuilder
                        control={control}
                        errors={errors}
                        setValue={setValue}
                        heading="Badge Earning Conditions"
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
