import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form as RadixForm } from 'radix-ui';
import AdminLayout from '@/layout/AdminLayout';
import AdminForm from '@/components/AdminForm';
import AdminLeftPanelContainer from '@/components/AdminLeftPanelContainer';
import AdminRightPanelContainer from '@/components/AdminRightPanelContainer';
import ChallengeInformation from './ChallengeInformation';
import ChallengeQuestions from './ChallengeQuestions';
import buildChallengeFormData, {
    initialChallengeValues,
} from './buildChallengeFormData';
import { buildChallengeSchema } from './challengeSchema';

/**
 * Challenge editor page. The whole challenge — its metadata, the
 * cover image, and the question/answer tree — lives in one
 * react-hook-form: questions are a field array with a nested
 * answers array per row, and the Save Challenge button validates
 * the payload before PUTting the multipart body (fresh audio and
 * cover included) to the server. Built on the lesson and course
 * editors' architecture.
 */
export default function Editor({
    challenge,
    categories = [],
    difficulties = [],
}) {
    const [isSaving, setIsSaving] = useState(false);

    // Edit context for the image rule — a stored cover satisfies
    // it until the admin removes it.
    const hasExistingImage = Boolean(challenge?.image_url);

    const challengeSchema = useMemo(
        () => buildChallengeSchema(categories, hasExistingImage),
        [categories, hasExistingImage],
    );

    const {
        control,
        handleSubmit,
        setValue,
        clearErrors,
        setError,
        formState: { errors },
    } = useForm({
        resolver: (values, context, options) =>
            zodResolver(challengeSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: initialChallengeValues(
            challenge,
            categories,
            difficulties,
        ),
    });

    // The PUT rides as a POST (method spoofing) — the FormData
    // carries the nested question/answer tree and any fresh
    // files, and the server's error keys land straight back on
    // the form fields.
    const onValid = (values) => {
        if (isSaving) {
            return;
        }

        router.post(
            `/dashboard/challenges/${challenge.id}`,
            buildChallengeFormData(values),
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
                title="Challenge"
                backTarget="Challenges"
                backUrl="/dashboard/challenges"
                onSave={handleSubmit(onValid)}
                isSaving={isSaving}
            >
                <AdminLeftPanelContainer>
                    <ChallengeInformation
                        control={control}
                        errors={errors}
                        challenge={challenge}
                        categories={categories}
                        difficulties={difficulties}
                        setValue={setValue}
                    />
                </AdminLeftPanelContainer>

                <AdminRightPanelContainer>
                    <ChallengeQuestions
                        control={control}
                        errors={errors}
                        setValue={setValue}
                    />
                </AdminRightPanelContainer>
            </AdminForm>
        </RadixForm.Root>
    );
}

Editor.layout = (page) => <AdminLayout>{page}</AdminLayout>;
