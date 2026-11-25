import { Controller, useWatch } from 'react-hook-form';
import { Clock, Star } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import NumberField from '@/components/NumberField';
import StatsContainer from '@/components/StatsContainer';
import StatItem from '@/components/StatItem';
import { LESSON_TYPES } from './lessonSchema';
import {
    durationLabelFor,
    previewStatsFor,
    timeLimitFromInput,
} from './lessonPreview';

/**
 * Lesson editor left panel — the metadata fields as react-hook-form
 * Controllers validated with the whole-payload save, plus the
 * duration/points preview. The preview reacts to the whole
 * editable payload live: the type, the exam time limit, the
 * article words, and the question tree.
 */
export default function LessonInformation({
    control,
    errors = {},
    onTypeChange,
}) {
    const type = useWatch({ control, name: 'type' }) ?? 'article';
    const duration = useWatch({ control, name: 'duration' });
    const articleContent = useWatch({ control, name: 'article_content' }) ?? '';
    const questions = useWatch({ control, name: 'questions' }) ?? [];

    // ── Duration/points preview ──
    const stats = previewStatsFor({
        type,
        articleContent,
        questions,
        duration,
    });

    const durationLabel = durationLabelFor(stats.duration);

    return (
        <>
            <SectionHeading title="Lesson Information" />

            {/* Lesson Title */}
            <Controller
                name="title"
                control={control}
                render={({ field }) => (
                    <TextField
                        name={field.name}
                        label="Lesson Title"
                        type="text"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter lesson title"
                        errorMessage={errors.title?.message}
                        required
                    />
                )}
            />

            {/* Type */}
            <Controller
                name="type"
                control={control}
                render={({ field }) => (
                    <SelectField
                        name={field.name}
                        label="Type"
                        options={LESSON_TYPES}
                        value={field.value}
                        onValueChange={(nextType) => {
                            field.onChange(nextType);
                            onTypeChange?.(nextType);
                        }}
                        placeholder="Select type"
                        errorMessage={errors.type?.message}
                        required
                    />
                )}
            />

            {/* Time Limit (Exams Only) — empty input is stored as
                null (not '') so the value stays type-correct for
                the wire format */}
            {type === 'exam' && (
                <Controller
                    name="duration"
                    control={control}
                    render={({ field }) => (
                        <NumberField
                            name={field.name}
                            label="Time Limit (Minutes)"
                            value={field.value ?? ''}
                            onChange={(e) =>
                                field.onChange(
                                    timeLimitFromInput(e.target.value),
                                )
                            }
                            onBlur={field.onBlur}
                            placeholder="Enter time limit in minutes"
                            errorMessage={errors.duration?.message}
                            required
                            min={1}
                        />
                    )}
                />
            )}

            {/* Duration/points preview */}
            <StatsContainer>
                <StatItem
                    icon={Clock}
                    label="Duration:"
                    value={durationLabel}
                />
                <StatItem icon={Star} label="Points:" value={stats.points} />
            </StatsContainer>
        </>
    );
}
