import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    User,
    Mail,
    Hash,
    University,
    Lock,
    Eye,
} from 'lucide-react';
import { Form } from 'radix-ui';

export default function Register() {
    return (
        <>
            <div className="flex min-h-screen">
                {/* Left Column: Hero Banner (Desktop Only) */}
                <div className="bg-primary-700/35 hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden bg-[url('/public/images/auth-image.png')] bg-cover bg-center bg-no-repeat p-10 bg-blend-overlay md:flex">
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center gap-2 self-start text-neutral-50/80 transition-colors duration-200 hover:text-neutral-50"
                    >
                        <ArrowLeft className="size-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
                        <span className="font-inter text-body-sm leading-none font-bold whitespace-nowrap">
                            Back to Home
                        </span>
                    </Link>
                    <div className="relative z-999 max-w-md text-neutral-50">
                        <h2 className="font-poppins text-title-lg leading-relaxed font-bold">
                            Learn. Practice. Succeed.
                        </h2>
                        <p className="font-inter text-body-sm text-neutral-50">
                            Join our community of students and master the CBT
                            INCITE exams with expert course modules and
                            realistic simulations.
                        </p>
                    </div>
                </div>
                {/* Right Column: Form Container */}
                <div className="flex w-full shrink-0 flex-col gap-5 bg-neutral-50 p-6 md:w-1/2 md:p-12 lg:p-16">
                    {/* Mobile Back Button */}
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center gap-2 self-start text-neutral-600 transition-colors duration-200 hover:text-neutral-900 md:hidden"
                    >
                        <ArrowLeft className="size-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
                        <span className="font-inter text-body-sm leading-none font-bold whitespace-nowrap">
                            Back to Home
                        </span>
                    </Link>

                    <div className="flex flex-col gap-5">
                        <div className="bg-primary-700 shrink-0 self-start rounded-2xl p-3 shadow-md/20 shadow-lg">
                            <User className="size-7 text-neutral-50" />
                        </div>
                        <div>
                            <h1 className="font-poppins text-title-lg font-bold text-neutral-900">
                                Create Account
                            </h1>
                            <p className="font-inter text-body-sm text-neutral-500">
                                Begin your learning adventure today
                            </p>
                        </div>
                    </div>

                    <Form.Root className="flex w-full flex-col gap-5">
                        <Form.Field
                            name="nama"
                            className="flex w-full flex-col gap-1.5"
                        >
                            <Form.Label
                                htmlFor="nama"
                                className="col-span-full"
                            >
                                <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                                    Nama
                                </span>
                            </Form.Label>
                            <div className="group relative flex items-center">
                                <Form.Control asChild>
                                    <input
                                        type="text"
                                        className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                                    />
                                </Form.Control>
                                <User className="group-focus-within:text-primary-700 pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center text-neutral-400 transition-colors duration-200" />
                            </div>

                            <Form.Message className="font-inter block text-xs text-red-500">
                                error
                            </Form.Message>
                        </Form.Field>
                        <Form.Field
                            name="email"
                            className="flex w-full flex-col gap-1.5"
                        >
                            <Form.Label
                                htmlFor="email"
                                className="col-span-full"
                            >
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
                </div>
            </div>
        </>
    );
}
