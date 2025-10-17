import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Link
                    to="/"
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 group"
                >
                    <ArrowLeft className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1"/>
                    Back to Dashboard
                </Link>

                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

                    <div className="prose prose-gray max-w-none">
                        <p className="text-sm text-gray-500 mb-6">Effective Date: Feb 15, 2025</p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
                            <p className="text-gray-600 mb-4">
                                These Terms of Service ("Terms") govern your use of our website,
                                products, and services
                                (collectively, the "Services"). By accessing or using our Services, you agree to these
                                Terms. If you do not
                                agree, please do not use our Services.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Eligibility</h2>
                            <p className="text-gray-600 mb-4">
                                To use our Services, you must be at least 18 years old and have the legal capacity to
                                enter into a binding
                                agreement. By using our Services, you represent and warrant that you meet these
                                requirements.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Use of Services</h2>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li>You agree to use our Services only for lawful purposes and in compliance with these
                                    Terms.
                                </li>
                                <li>You will not engage in any activity that interferes with or disrupts the Services.
                                </li>
                                <li>You are responsible for maintaining the confidentiality of any account credentials
                                    and for all activities that occur under your account.
                                </li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Intellectual Property</h2>
                            <p className="text-gray-600">
                                All content, trademarks, and intellectual property related to the Services are owned by
                                Ammon Larson or our
                                licensors. You may not use our intellectual property without prior written permission.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. User Content</h2>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li>You retain ownership of any content you submit to the Services.</li>
                                <li>By submitting content, you grant Ammon Larson a worldwide, non-exclusive, royalty-free
                                    license to use, display, and distribute your content as necessary to provide the
                                    Services.
                                </li>
                                <li>You warrant that your content does not violate any third-party rights.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Privacy</h2>
                            <p className="text-gray-600">
                                Your use of the Services is subject to our Privacy Policy, which explains how we
                                collect, use, and protect your data.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Disclaimers and Limitation of
                                Liability</h2>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li>The Services are provided "as is" without warranties of any kind.</li>
                                <li>Ammon Larson is not liable for any indirect, incidental, or consequential damages arising
                                    from your use of the Services.
                                </li>
                                <li>Our total liability under these Terms shall not exceed the amount you have paid for
                                    the Services in the past 12 months.
                                </li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Termination</h2>
                            <p className="text-gray-600">
                                We may suspend or terminate your access to the Services at any time, with or without
                                cause, including
                                for any violation of these Terms.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Governing Law</h2>
                            <p className="text-gray-600">
                                These Terms shall be governed by and construed in accordance with the laws of Denmark.
                                Any disputes
                                arising from these Terms shall be resolved in the courts of Denmark.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Changes to These Terms</h2>
                            <p className="text-gray-600">
                                Ammon Larson reserves the right to update these Terms at any time. We will notify users of
                                significant
                                changes by posting an updated version on our website.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Contact Information</h2>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}