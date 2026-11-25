import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form as RadixForm } from 'radix-ui';
import { Film, BookOpen, Clock, Star } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminForm from '@/components/AdminForm';
import AdminLeftPanelContainer from '@/components/AdminLeftPanelContainer';
import AdminRightPanelContainer from '@/components/AdminRightPanelContainer';
import SectionHeading from '@/components/SectionHeading';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import ImageUploader from '@/components/ImageUploader';
import StatsContainer from '@/components/StatsContainer';
import StatItem from '@/components/StatItem';
import CourseContent from './CourseContent';
import {
    COURSE_STATUSES,
    MAX_IMAGE_MB,
    buildCourseInfoSchema,
    courseStatsFor,
    existingImageUrlFor,
    removeImageFlag,
} from './courseInfo';
import { formatDuration } from '../courseTable';

/**
 * Course editor page. The Course Information panel is a live
 * react-hook-form — the Save Course button validates it with the
 * zod schema (metadata plus the cover image) and PUTs it to the
 * server. The right panel renders the module/lesson outline, whose
 * add, reorder, and rename decisions live in courseOutline.js; the
 * form's schema, stats, and image decisions live in courseInfo.js.
 */
export default function Editor({ course, categories = [] }) {
    const [isSaving, setIsSaving] = useState(false);

    const courseStats = courseStatsFor(course);

    // Edit context for the image rule — a stored cover image
    // satisfies it until the admin removes it.
    const hasExistingImage = Boolean(course?.image_url);

    const courseInfoSchema = useMemo(
        () => buildCourseInfoSchema({ categories, hasExistingImage }),
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
            zodResolver(courseInfoSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: {
            title: course?.title ?? '',
            category: course?.category ?? '',
            status: course?.status ?? 'draft',
            short_description: course?.short_description ?? '',
            long_description: course?.long_description ?? '',
            image: null,
            remove_image: false,
        },
    });

    // The stored-preview switch: clearing the image hides the
    // stored cover instantly client-side, while the course prop
    // only refreshes after the server round-trip.
    const removeImage = useWatch({ control, name: 'remove_image' });
    const existingImageUrl = existingImageUrlFor(
        removeImage,
        course?.image_url,
    );

    // The PUT rides as a POST (method spoofing) — Inertia switches
    // to multipart automatically when the payload carries a File.
    // The server validates the same fields and its error keys land
    // back on the form fields.
    const onValid = (values) => {
        if (isSaving) {
            return;
        }

        router.post(
            `/dashboard/courses/${course.id}`,
            {
                _method: 'put',
                title: values.title,
                category: values.category,
                status: values.status,
                short_description: values.short_description,
                long_description: values.long_description,
                image: values.image,
                remove_image: removeImageFlag(values.remove_image),
            },
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
                title="Course"
                backTarget="Courses"
                backUrl="/dashboard/courses"
                onSave={handleSubmit(onValid)}
                isSaving={isSaving}
            >
                <AdminLeftPanelContainer>
                    <SectionHeading title="Course Information" />

                    {/* Course Title */}
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                name={field.name}
                                label="Course Title"
                                type="text"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder="Enter course title"
                                errorMessage={errors.title?.message}
                                required
                            />
                        )}
                    />

                    {/* Category */}
                    <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                            <SelectField
                                name={field.name}
                                label="Category"
                                options={categories}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Select category"
                                errorMessage={errors.category?.message}
                                required
                            />
                        )}
                    />

                    {/* Publish Status */}
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <SelectField
                                name={field.name}
                                label="Status"
                                options={COURSE_STATUSES}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Select status"
                                errorMessage={errors.status?.message}
                                required
                            />
                        )}
                    />

                    {/* Short Description */}
                    <Controller
                        name="short_description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                name={field.name}
                                label="Short Description"
                                type="text"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder="Brief description (1 sentence)"
                                errorMessage={errors.short_description?.message}
                                required
                            />
                        )}
                    />

                    {/* Long Description */}
                    <Controller
                        name="long_description"
                        control={control}
                        render={({ field }) => (
                            <TextAreaField
                                name={field.name}
                                label="Long Description"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder="Detailed curriculum description, learning outcomes..."
                                rows={4}
                                errorMessage={errors.long_description?.message}
                                required
                            />
                        )}
                    />

                    {/* Course Image — a fresh upload replaces the
                        stored one, the ✕ clears it, anything else
                        keeps it */}
                    <Controller
                        name="image"
                        control={control}
                        render={({ field }) => (
                            <ImageUploader
                                label="Course Image"
                                value={field.value}
                                existingUrl={existingImageUrl}
                                onChange={(file) => {
                                    field.onChange(file);

                                    // A newly selected File also
                                    // un-removes a previously
                                    // cleared stored image.
                                    if (file) {
                                        setValue('remove_image', false, {
                                            shouldDirty: true,
                                        });
                                    }
                                }}
                                onClearExisting={() =>
                                    setValue('remove_image', true, {
                                        shouldDirty: true,
                                    })
                                }
                                maxSizeMB={MAX_IMAGE_MB}
                                errorMessage={errors.image?.message}
                                required
                            />
                        )}
                    />

                    {/* Metrics counter boxes */}
                    <StatsContainer>
                        <StatItem
                            icon={Clock}
                            label="Duration:"
                            value={formatDuration(courseStats.duration || 0)}
                        />
                        <StatItem
                            icon={BookOpen}
                            label="Modules:"
                            value={courseStats.modulesCount || 0}
                        />
                        <StatItem
                            icon={Film}
                            label="Lessons:"
                            value={courseStats.lessonsCount || 0}
                        />
                        <StatItem
                            icon={Star}
                            label="Points:"
                            value={courseStats.points || 0}
                        />
                    </StatsContainer>
                </AdminLeftPanelContainer>

                <AdminRightPanelContainer>
                    <CourseContent course={course} />
                </AdminRightPanelContainer>
            </AdminForm>
        </RadixForm.Root>
    );
}

Editor.layout = (page) => <AdminLayout>{page}</AdminLayout>;
