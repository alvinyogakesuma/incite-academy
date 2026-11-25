import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form as RadixForm } from 'radix-ui';
import AdminLayout from '@/layout/AdminLayout';
import AdminForm from '@/components/AdminForm';
import AdminLeftPanelContainer from '@/components/AdminLeftPanelContainer';
import AdminRightPanelContainer from '@/components/AdminRightPanelContainer';
import LearningPathInformation from './LearningPathInformation';
import CourseSequence from './CourseSequence';
import buildLearningPathFormData, {
    initialLearningPathValues,
} from './buildLearningPathFormData';
import { sequenceStatsFor } from './learningPathStats';
import { buildLearningPathSchema } from './learningPathSchema';

/**
 * Learning path editor page. The whole path — its metadata, the
 * cover image, and the course sequence — lives in one
 * react-hook-form: the sequence is a field array of course slots
 * whose order carries the pivot's order_index, and the Save
 * Learning Path button validates the payload before PUTting the
 * multipart body to the server. Built on the lesson, course, and
 * challenge editors' architecture.
 */
export default function Editor({
    learningPath,
    levels = [],
    availableCourses = [],
}) {
    const [isSaving, setIsSaving] = useState(false);

    // Edit context for the image rule — a stored cover satisfies
    // it until the admin removes it.
    const hasExistingImage = Boolean(learningPath?.image_url);

    const learningPathSchema = useMemo(
        () => buildLearningPathSchema(hasExistingImage),
        [hasExistingImage],
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
            zodResolver(learningPathSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: initialLearningPathValues(learningPath, levels),
    });

    // The live sequence stats — the selected courses' combined
    // duration and count, derived from the available courses.
    const selectedCourses = useWatch({
        control,
        name: 'courses',
    });

    const stats = useMemo(
        () => sequenceStatsFor(selectedCourses, availableCourses),
        [availableCourses, selectedCourses],
    );

    // The PUT rides as a POST (method spoofing) — the FormData
    // carries the course sequence and any fresh files, and the
    // server's error keys land straight back on the form fields.
    const onValid = (values) => {
        if (isSaving) {
            return;
        }

        router.post(
            `/dashboard/learning-paths/${learningPath.id}`,
            buildLearningPathFormData(values),
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
                title="Learning Path"
                backTarget="Learning Paths"
                backUrl="/dashboard/learning-paths"
                onSave={handleSubmit(onValid)}
                isSaving={isSaving}
            >
                <AdminLeftPanelContainer>
                    <LearningPathInformation
                        control={control}
                        errors={errors}
                        learningPath={learningPath}
                        levels={levels}
                        setValue={setValue}
                        stats={stats}
                    />
                </AdminLeftPanelContainer>

                <AdminRightPanelContainer>
                    <CourseSequence
                        control={control}
                        errors={errors}
                        availableCourses={availableCourses}
                    />
                </AdminRightPanelContainer>
            </AdminForm>
        </RadixForm.Root>
    );
}

Editor.layout = (page) => <AdminLayout>{page}</AdminLayout>;
