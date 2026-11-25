import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { Upload, Volume2, X } from 'lucide-react';

/**
 * Listening-question audio upload block. Howler drives the metadata
 * read (duration) and resource cleanup; the visible preview uses the
 * native audio element with controls. `onUpload` and `onRemove` are
 * owned by the parent form.
 */
export default function AudioUploadInput({
    audioUrl,
    audioFilename,
    audioDuration,
    onUpload,
    onRemove,
    onDurationRead,
    className = '',
    maxSizeMB = 10,
}) {
    const fileInputRef = useRef(null);
    const howlRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    // Load metadata (duration) through Howler whenever a new object
    // URL appears — report it to the parent, then free the instance.
    useEffect(() => {
        if (!audioUrl) return undefined;

        const howl = new Howl({ src: [audioUrl], html5: true, preload: true });
        howlRef.current = howl;

        const reportDuration = () => {
            howlRef.current = null;
            onDurationRead?.(howl.duration());
            howl.unload();
        };

        howl.on('load', reportDuration);

        return () => {
            howlRef.current = null;
            howl.off('load', reportDuration);
            howl.unload();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioUrl]);

    // Size enforcement lives in the form's validation (backend rule:
    // max 10MB); `maxSizeMB` only drives the caption.
    const handleFile = (file) => {
        onUpload?.(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }

        // Reset so re-selecting the same file re-fires onChange.
        e.target.value = '';
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

    const handleRemove = () => {
        onRemove?.();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label className="font-inter text-body-sm block font-bold text-neutral-700">
                Audio File Upload <span className="text-error-500">*</span>
            </label>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*"
                className="hidden"
            />

            {audioUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-950/5 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2">
                        <Volume2 className="text-primary-700 size-5 shrink-0 animate-pulse" />
                        <div className="space-y-0.5">
                            <p className="font-inter text-body-sm max-w-[200px] truncate font-bold text-neutral-950 md:max-w-md">
                                {audioFilename}
                            </p>
                            {audioDuration != null && (
                                <p className="font-inter text-caption text-neutral-500">
                                    Duration: {Math.round(audioDuration)}{' '}
                                    seconds
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <audio
                            src={audioUrl}
                            controls
                            className="h-8 max-w-[160px] md:max-w-[200px]"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="hover:bg-error-50 hover:text-error-500 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors"
                            title="Remove audio"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                        dragActive
                            ? 'border-primary-700 bg-primary-50/50'
                            : 'bg-primary-50/25 hover:bg-primary-50/45 border-neutral-950/10'
                    }`}
                >
                    <Upload className="text-primary-700 size-6" />
                    <div className="space-y-0.5">
                        <p className="font-inter text-body-sm font-bold text-neutral-950">
                            Drag &amp; drop audio file or click to upload
                        </p>
                        <p className="font-inter text-caption text-neutral-500/60">
                            Supported formats: MP3, WAV, OGG up to {maxSizeMB}MB
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
