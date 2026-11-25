import { Controller, useWatch } from 'react-hook-form';
import { Clock, HelpCircle, Star } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import NumberField from '@/components/NumberField';
import ImageUploader from '@/components/ImageUploader';
import StatsContainer from '@/components/StatsContainer';
import StatItem from '@/components/StatItem';
import { DIFFICULTIES, MAX_IMAGE_MB } from './challengeSchema';

const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/**
 * Challenge editor left panel — the metadata form: title,
 * category, difficulty, description, the point reward, the timed
 * limit, and the cover image, with the stored stats below. The
 * course editor's panel structure.
 */
export default function ChallengeInformation({
    control,
    errors = {},
    challenge,
    categories = [],
    difficulties = [],
    setValue,
}) {
    // The stored-preview switch: clearing the image hides the
    // stored cover instantly client-side, while the challenge
    // prop only refreshes after the server round-trip.
    const removeImage = useWatch({ control, name: 'remove_image' });
    const existingImageUrl = removeImage
        ? null
        : (challenge?.image_url ?? null);

    const questionsCount = (challenge?.questions ?? []).length;

    return (
        <>
            <SectionHeading title="Challenge Information" />

            {/* Challenge Title */}
            <Controller
                name="title"
                control={control}
                render={({ field }) => (
                    <TextField
                        name={field.name}
                        label="Challenge Title"
                        type="text"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter challenge title"
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

            {/* Difficulty */}
            <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                    <SelectField
                        name={field.name}
                        label="Difficulty"
                        options={
                            difficulties.length > 0
                                ? difficulties
                                : DIFFICULTIES
                        }
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select difficulty"
                        errorMessage={errors.difficulty?.message}
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
                        placeholder="Describe the challenge objective, rules, and scoring..."
                        rows={4}
                        errorMessage={errors.description?.message}
                        required
                    />
                )}
            />

            {/* Points — empty input is stored as null (not '')
                so the value stays type-correct for the wire
                format */}
            <Controller
                name="points"
                control={control}
                render={({ field }) => (
                    <NumberField
                        name={field.name}
                        label="Points"
                        value={field.value ?? ''}
                        onChange={(e) =>
                            field.onChange(
                                e.target.value === ''
                                    ? null
                                    : Math.max(
                                          0,
                                          parseInt(e.target.value, 10) || 0,
                                      ),
                            )
                        }
                        onBlur={field.onBlur}
                        placeholder="Enter point reward"
                        errorMessage={errors.points?.message}
                        required
                        min={0}
                    />
                )}
            />

            {/* Time Limit — empty input is stored as null (not '')
                so the value stays type-correct for the wire
                format */}
            <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                    <NumberField
                        name={field.name}
                        label="Time Limit (minutes)"
                        value={field.value ?? ''}
                        onChange={(e) =>
                            field.onChange(
                                e.target.value === ''
                                    ? null
                                    : Math.max(
                                          1,
                                          parseInt(e.target.value, 10) || 1,
                                      ),
                            )
                        }
                        onBlur={field.onBlur}
                        placeholder="Enter the timed limit"
                        errorMessage={errors.duration?.message}
                        required
                        min={1}
                    />
                )}
            />

            {/* Challenge Image — a fresh upload replaces the
                stored one, the ✕ clears it, anything else keeps
                it */}
            <Controller
                name="image"
                control={control}
                render={({ field }) => (
                    <ImageUploader
                        label="Challenge Image"
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

            {/* Metrics counter boxes */}
            <StatsContainer>
                <StatItem
                    icon={Clock}
                    label="Duration:"
                    value={formatDuration(challenge?.duration || 0)}
                />
                <StatItem
                    icon={HelpCircle}
                    label="Questions:"
                    value={questionsCount}
                />
                <StatItem
                    icon={Star}
                    label="Points:"
                    value={challenge?.points || 0}
                />
            </StatsContainer>
        </>
    );
}
