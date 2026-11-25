import { useEffect, useRef, useState } from 'react';
import { UploadCloud, X, Film } from 'lucide-react';

/**
 * Image picker/preview block. Emits the raw File on change (null when
 * cleared) so form state can hold the File itself — previews are
 * presentation-only state derived here, with the object URL revoked
 * on change and unmount. Size/mime enforcement lives in the Zod
 * schema; `maxSizeMB` only drives the caption.
 */
export default function ImageUploader({
    label,
    value,
    existingUrl = null,
    onChange,
    onClearExisting,
    errorMessage = '',
    required = false,
    accept = 'image/*',
    maxSizeMB = 5,
    className = '',
}) {
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Derive the preview from the selected File, revoking the old
    // object URL whenever the value changes or the component unmounts.
    useEffect(() => {
        if (!value) {
            setPreviewUrl(null);
            return undefined;
        }

        const url = URL.createObjectURL(value);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [value]);

    const handleFile = (file) => {
        onChange?.(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }

        // Reset so re-selecting the same file re-fires onChange.
        e.target.value = '';
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    const clearImage = () => {
        onChange?.(null);
        if (existingUrl) {
            onClearExisting?.();
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const isInvalid = Boolean(errorMessage);
    const activePreviewUrl = previewUrl || existingUrl;
    const hasImage = Boolean(value || existingUrl);

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label className="font-inter text-body-sm block font-bold text-neutral-700">
                    {label}{' '}
                    {required && <span className="text-error-500">*</span>}
                </label>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={accept}
                className="hidden"
            />

            {hasImage ? (
                <div className="bg-primary-50/30 relative flex items-center gap-3 overflow-hidden rounded-2xl border border-neutral-950/10 p-2">
                    {activePreviewUrl ? (
                        <img
                            src={activePreviewUrl}
                            alt="Preview"
                            className="size-14 shrink-0 rounded-lg border border-neutral-950/5 bg-white object-cover"
                        />
                    ) : (
                        <div className="bg-primary-50 text-primary-700 flex size-14 shrink-0 items-center justify-center rounded-lg border border-neutral-950/5">
                            <Film className="size-6" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-inter text-body-sm truncate font-medium text-neutral-950">
                            {value ? value.name : existingUrl.split('/').pop()}
                        </p>
                        <p className="font-inter text-caption text-neutral-500">
                            {value
                                ? value.size
                                    ? `${(value.size / 1024 / 1024).toFixed(2)} MB`
                                    : 'Unknown size'
                                : 'Saved cover image'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={clearImage}
                        className="hover:bg-error-50 hover:text-error-500 cursor-pointer rounded-xl border border-neutral-950/5 bg-white p-1.5 text-neutral-500 transition-all"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            ) : (
                <div
                    onClick={triggerUpload}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
                        dragActive
                            ? 'border-primary-700 bg-primary-50/50'
                            : isInvalid
                              ? 'bg-error-50/10 hover:bg-error-50/20 border-error-500'
                              : 'bg-primary-50/20 hover:bg-primary-50/40 border-neutral-950/10'
                    }`}
                >
                    <div className="rounded-2xl border border-neutral-950/5 bg-white p-3 shadow-sm">
                        <UploadCloud className="text-primary-700 size-6" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="font-inter text-body-sm font-semibold text-neutral-950">
                            Drag &amp; drop or click
                        </p>
                        <p className="font-inter text-caption text-neutral-500/60">
                            Supports PNG, JPG, JPEG up to {maxSizeMB}MB
                        </p>
                    </div>
                </div>
            )}
            {errorMessage && (
                <p className="font-inter text-body-sm text-error-500 mt-1">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
