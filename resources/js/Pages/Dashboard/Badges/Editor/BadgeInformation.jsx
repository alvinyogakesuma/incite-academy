import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Trophy } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import ImageUploader from '@/components/ImageUploader';
import { MAX_IMAGE_MB } from './badgeSchema';

/**
 * Badge editor left panel — the metadata form: name, description,
 * the optional icon, and the live preview ring: the picked file,
 * the stored icon, or the pulsing Trophy fallback, with the badge
 * name beneath. The challenge editor's panel structure.
 */
export default function BadgeInformation({
    control,
    errors = {},
    badge,
    setValue,
}) {
    const title = useWatch({ control, name: 'title' });
    const icon = useWatch({ control, name: 'icon' });
    const removeIcon = useWatch({ control, name: 'remove_icon' });

    // Fresh picks preview through an object URL — created once per
    // file and revoked on swap or unmount.
    const [objectUrl, setObjectUrl] = useState(null);
    useEffect(() => {
        if (!(icon instanceof File)) {
            setObjectUrl(null);
            return undefined;
        }

        const url = URL.createObjectURL(icon);
        setObjectUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [icon]);

    // The stored-preview switch: clearing the icon hides the
    // stored one instantly client-side, while the badge prop only
    // refreshes after the server round-trip.
    const storedUrl = removeIcon ? null : (badge?.icon_url ?? null);
    const previewUrl = icon instanceof File ? objectUrl : storedUrl;

    return (
        <>
            <SectionHeading title="Basic Information" />

            {/* Badge Name */}
            <Controller
                name="title"
                control={control}
                render={({ field }) => (
                    <TextField
                        name={field.name}
                        label="Badge Name"
                        type="text"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter badge name..."
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
                        placeholder="Describe how to earn this badge"
                        rows={4}
                        errorMessage={errors.description?.message}
                        required
                    />
                )}
            />

            {/* Badge Icon — optional: a fresh upload replaces the
                stored one, the ✕ clears it, anything else keeps it
                */}
            <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                    <ImageUploader
                        label="Badge Icon"
                        value={field.value}
                        existingUrl={storedUrl}
                        onChange={(file) => {
                            field.onChange(file);

                            // A newly selected File also un-removes a
                            // previously cleared stored icon.
                            if (file) {
                                setValue('remove_icon', false, {
                                    shouldDirty: true,
                                });
                            }
                        }}
                        onClearExisting={() =>
                            setValue('remove_icon', true, {
                                shouldDirty: true,
                            })
                        }
                        maxSizeMB={MAX_IMAGE_MB}
                        errorMessage={errors.icon?.message}
                    />
                )}
            />

            {/* Live Preview */}
            <div className="space-y-2">
                <label className="font-inter text-body-sm block font-bold text-neutral-700">
                    Preview
                </label>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-950/5 bg-neutral-50/50 p-6 text-center shadow-inner">
                    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-neutral-950/10 bg-white shadow-md transition-all duration-300">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Badge Preview"
                                className="size-full object-cover"
                            />
                        ) : (
                            <Trophy className="text-primary-700 size-8 animate-pulse" />
                        )}
                    </div>
                    <h4
                        className={`font-poppins text-caption mt-3 max-w-full truncate font-bold ${
                            title ? 'text-neutral-950' : 'text-neutral-500/40'
                        }`}
                    >
                        {title || 'Badge Name'}
                    </h4>
                </div>
            </div>
        </>
    );
}
