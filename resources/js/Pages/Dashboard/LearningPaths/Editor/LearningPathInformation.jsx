import { Controller, useWatch } from 'react-hook-form';
import { BookOpen, Clock } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import ImageUploader from '@/components/ImageUploader';
import StatsContainer from '@/components/StatsContainer';
import StatItem from '@/components/StatItem';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';
import { LEVELS, MAX_IMAGE_MB } from './learningPathSchema';

/**
 * Learning path editor left panel — the metadata form: title,
 * description, the level banding, and the cover image, with the
 * live sequence stats below: the selected courses' combined
 * duration and count. The challenge editor's panel structure.
 */
export default function LearningPathInformation({
    control,
    errors = {},
    learningPath,
    levels = [],
    setValue,
    stats,
}) {
    // The stored-preview switch: clearing the image hides the
    // stored cover instantly client-side, while the learning path
    // prop only refreshes after the server round-trip.
    const removeImage = useWatch({ control, name: 'remove_image' });
    const existingImageUrl = removeImage
        ? null
        : (learningPath?.image_url ?? null);

    return (
        <>
            <SectionHeading title="Basic Information" />

            {/* Path Title */}
            <Controller
                name="title"
                control={control}
                render={({ field }) => (
                    <TextField
                        name={field.name}
                        label="Path Title"
                        type="text"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter learning path title"
                        errorMessage={errors.title?.message}
                        required
                    />
                )}
            />

            {/* Description */}
            <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <TextAreaField
                        name={field.name}
                        label="Description"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Describe what this learning path covers"
                        rows={4}
                        errorMessage={errors.description?.message}
                        required
                    />
                )}
            />

            {/* Level */}
            <Controller
                name="level"
                control={control}
                render={({ field }) => (
                    <SelectField
                        name={field.name}
                        label="Level"
                        options={levels.length > 0 ? levels : LEVELS}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select level"
                        errorMessage={errors.level?.message}
                        required
                    />
                )}
            />

            {/* Learning Path Image — a fresh upload replaces the
                stored one, the ✕ clears it, anything else keeps
                it */}
            <Controller
                name="image"
                control={control}
                render={({ field }) => (
                    <ImageUploader
                        label="Learning Path Image"
                        value={field.value}
                        existingUrl={existingImageUrl}
                        onChange={(file) => {
                            field.onChange(file);

                            // A newly selected File also un-removes a
                            // previously cleared stored image.
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

            {/* Live sequence stats */}
            <StatsContainer>
                <StatItem
                    icon={Clock}
                    label="Duration:"
                    value={formatDuration(stats.totalDuration || 0)}
                />
                <StatItem
                    icon={BookOpen}
                    label="Courses:"
                    value={stats.coursesCount || 0}
                />
            </StatsContainer>
        </>
    );
}
