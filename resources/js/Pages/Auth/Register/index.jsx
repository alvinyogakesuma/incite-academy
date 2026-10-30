import { useForm } from '@inertiajs/react';
import { User, Mail, Hash, University, Lock, Eye } from 'lucide-react';
import { Form } from 'radix-ui';
import TextField from '@/components/TextField';
import AuthLayout from '@/layout/AuthLayout';

export default function Register() {
    const {
        data,
        setData,
        post,
        // processing,
        errors,
        reset,
        // setError,
        clearErrors,
    } = useForm({
        name: '',
        email: '',
        nim_nip: '',
        major_departement: '',
        password: '',
        password_confirmations: '',
    });

    const handleFieldChange = (field, value) => {
        setData(field, value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        clearErrors();
        post('/register', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Form.Root
                className="flex w-full flex-col gap-5"
                onSubmit={handleSubmit}
                noValidate
            >
                <TextField
                    name="name"
                    label="Nama"
                    type="text"
                    icon={User}
                    value={data.name}
                    errorMessage={errors.name}
                    autoComplete="name"
                    placeholder="alvin.121140154@student.itera.ac.id"
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                />
                <Form.Field
                    name="email"
                    className="flex w-full flex-col gap-1.5"
                >
                    <Form.Label htmlFor="email" className="col-span-full">
                        <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                            Email
                        </span>
                    </Form.Label>
                    <div className="group relative flex items-center">
                        <Form.Control asChild>
                            <input
                                type="email"
                                className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                            />
                        </Form.Control>
                        <Mail className="group-focus-within:text-primary-700 pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center text-neutral-400 transition-colors duration-200" />
                    </div>

                    <Form.Message className="font-inter block text-xs text-red-500">
                        error
                    </Form.Message>
                </Form.Field>
                <Form.Field
                    name="nim_nip"
                    className="flex w-full flex-col gap-1.5"
                >
                    <Form.Label htmlFor="text">
                        <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                            NIM
                        </span>
                    </Form.Label>
                    <div className="group relative flex items-center">
                        <Form.Control asChild>
                            <input
                                type="number"
                                className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                            />
                        </Form.Control>
                        <Hash className="group-focus-within:text-primary-700 pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center text-neutral-400 transition-colors duration-200" />
                    </div>

                    <Form.Message className="font-inter block text-xs text-red-500">
                        error
                    </Form.Message>
                </Form.Field>
                <Form.Field
                    name="major_departement"
                    className="flex w-full flex-col gap-1.5"
                >
                    <Form.Label htmlFor="text">
                        <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                            Program Studi
                        </span>
                    </Form.Label>
                    <div className="group relative flex items-center">
                        <Form.Control asChild>
                            <input
                                type="number"
                                className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                            />
                        </Form.Control>
                        <University className="group-focus-within:text-primary-700 pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center text-neutral-400 transition-colors duration-200" />
                    </div>

                    <Form.Message className="font-inter block text-xs text-red-500">
                        error
                    </Form.Message>
                </Form.Field>
                <Form.Field
                    name="password"
                    className="flex w-full flex-col gap-1.5"
                >
                    <Form.Label htmlFor="text">
                        <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                            Password
                        </span>
                    </Form.Label>
                    <div className="group relative flex items-center">
                        <Form.Control asChild>
                            <input
                                type="password"
                                className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                            />
                        </Form.Control>
                        <Lock className="group-focus-within:text-primary-700 pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center text-neutral-400 transition-colors duration-200" />

                        <button
                            type="button"
                            className="hover:text-primary-700 absolute inset-y-0 right-0 z-10 mr-4 shrink-0 cursor-pointer text-slate-400 transition-all duration-200 hover:scale-110 active:scale-90"
                            aria-label=""
                        >
                            <Eye className="size-4" />
                        </button>
                    </div>

                    <Form.Message className="font-inter block text-xs text-red-500">
                        error
                    </Form.Message>
                </Form.Field>
                <Form.Field
                    name="password"
                    className="flex w-full flex-col gap-1.5"
                >
                    <Form.Label htmlFor="text">
                        <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                            Password
                        </span>
                    </Form.Label>
                    <div className="group relative flex items-center">
                        <Form.Control asChild>
                            <input
                                type="password"
                                className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                            />
                        </Form.Control>
                        <Lock className="group-focus-within:text-primary-700 pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center text-neutral-400 transition-colors duration-200" />

                        <button
                            type="button"
                            className="hover:text-primary-700 absolute inset-y-0 right-0 z-10 mr-4 shrink-0 cursor-pointer text-slate-400 transition-all duration-200 hover:scale-110 active:scale-90"
                            aria-label=""
                        >
                            <Eye className="size-4" />
                        </button>
                    </div>

                    <Form.Message className="font-inter block text-xs text-red-500">
                        error
                    </Form.Message>
                </Form.Field>
                <Form.Submit asChild>
                    <button
                        type="submit"
                        className="from-brand font-inter shadow-brand/10 hover:shadow-brand/20 bg-primary-700 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 text-xs font-bold tracking-wider whitespace-nowrap text-white uppercase shadow-md transition-all duration-200 ease-in-out hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                    >
                        Sign in
                    </button>
                </Form.Submit>
            </Form.Root>
        </>
    );
}

Register.layout = [
    AuthLayout,
    {
        icon: User,
        title: 'Create Account',
        subtitle: 'Begin your learning adventure today',
    },
];
