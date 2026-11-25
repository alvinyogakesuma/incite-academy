import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form as RadixForm } from 'radix-ui';
import AdminLayout from '@/layout/AdminLayout';
import AdminForm from '@/components/AdminForm';
import AdminLeftPanelContainer from '@/components/AdminLeftPanelContainer';
import AdminRightPanelContainer from '@/components/AdminRightPanelContainer';
import LessonInformation from './LessonInformation';
import LessonContent from './LessonContent';
import buildLessonFormData, {
    initialLessonValues,
} from './buildLessonFormData';
import { buildLessonSchema, schemaForType } from './lessonSchema';

/**
 * Lesson editor page. The whole lesson — metadata, the article
 * body, and the question/answer tree — lives in one
 * react-hook-form: questions are a field array with a nested
 * answers array per row, and the Save Lesson button validates the
 * branch matching the lesson's type before PUTting the multipart
 * payload (fresh audio included) to the server.
 */
export default function Editor({ lesson, courseId }) {
    const [isSaving, setIsSaving] = useState(false);

    // One schema per lesson type — the resolver picks by the
    // values being validated, so stale rows of the inactive
    // branch (a quiz tree while saving an article, a half-written
    // body while saving a quiz) never block a save.
    const schemas = useMemo(
        () => ({
            article: buildLessonSchema('article'),
            quiz: buildLessonSchema('quiz'),
            exam: buildLessonSchema('exam'),
        }),
        [],
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
            zodResolver(schemaForType(values.type, schemas))(
                values,
                context,
                options,
            ),
        mode: 'onChange',
        defaultValues: initialLessonValues(lesson),
    });

    // The PUT rides as a POST (method spoofing) — the FormData
    // carries the nested question/answer tree and any fresh
    // audio files, and the server's error keys land straight
    // back on the form fields.
    const onValid = (values) => {
        if (isSaving) {
            return;
        }

        router.post(
            `/dashboard/courses/${courseId}/lessons/${lesson.id}`,
            buildLessonFormData(values),
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
        // Radix Form.Root - the field components render Form.Field, which throws outside one
        <RadixForm.Root className="space-y-8">
            <AdminForm
                title="Lesson"
                backTarget="Course"
                backUrl={`/dashboard/courses/${courseId}/edit`}
                onSave={handleSubmit(onValid)}
                isSaving={isSaving}
            >
                <AdminLeftPanelContainer>
                    <LessonInformation
                        control={control}
                        errors={errors}
                        onTypeChange={(nextType) => {
                            // A stale exam time limit never rides
                            // in the payload after a type switch.
                            if (nextType !== 'exam') {
                                setValue('duration', null, {
                                    shouldDirty: true,
                                });
                            }
                        }}
                    />
                </AdminLeftPanelContainer>

                <AdminRightPanelContainer>
                    <LessonContent
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
