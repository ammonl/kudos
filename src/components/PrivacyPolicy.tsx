import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

                    <div className="prose prose-gray max-w-none">
                        <p className="text-sm text-gray-500 mb-6">Effective Date: Feb 15, 2025</p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
                            <p className="text-gray-600 mb-4">
                                Your privacy is important to us. This Privacy Policy explains how we
                                collect, use, disclose,
                                and safeguard your information when you visit our website and use our services. By using
                                our website and services,
                                you agree to the terms of this policy.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
                            <p className="text-gray-600 mb-4">We may collect the following types of information:</p>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li><strong>Personal Information:</strong> Name, email address, phone number, payment
                                    information, and other identifiers you provide.
                                </li>
                                <li><strong>Non-Personal Information:</strong> Browser type, device information, IP
                                    address, and website usage data collected through cookies and similar technologies.
                                </li>
                                <li><strong>User-Generated Content:</strong> Comments, reviews, and other materials you
                                    submit to our platform.
                                </li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your
                                Information</h2>
                            <p className="text-gray-600 mb-4">We use the collected information for the following
                                purposes:</p>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li>To provide, operate, and improve our services.</li>
                                <li>To process transactions and send related communications.</li>
                                <li>To personalize user experience and provide customer support.</li>
                                <li>To ensure security and prevent fraud.</li>
                                <li>To comply with legal obligations.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. How We Share Your
                                Information</h2>
                            <p className="text-gray-600 mb-4">
                                We do not sell or rent your personal information. However, we may share your information
                                with:
                            </p>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li><strong>Service Providers:</strong> Third-party companies that assist us in
                                    providing our services.
                                </li>
                                <li><strong>Legal Authorities:</strong> When required by law, court order, or to protect
                                    our rights.
                                </li>
                                <li><strong>Business Transfers:</strong> In case of mergers, acquisitions, or sale of
                                    assets.
                                </li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Cookies and Tracking
                                Technologies</h2>
                            <p className="text-gray-600">
                                We use cookies and similar tracking technologies to enhance your experience. You can
                                control cookie
                                preferences through your browser settings.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Data Security</h2>
                            <p className="text-gray-600">
                                We implement reasonable security measures to protect your data. However, no method of
                                transmission
                                over the internet is completely secure.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Your Rights and Choices</h2>
                            <p className="text-gray-600 mb-4">
                                Depending on your location, you may have the following rights regarding your personal
                                information:
                            </p>
                            <ul className="list-disc pl-6 text-gray-600 space-y-2">
                                <li>Access, update, or delete your information.</li>
                                <li>Object to data processing or request restriction of processing.</li>
                                <li>Withdraw consent where processing is based on consent.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Third-Party Links</h2>
                            <p className="text-gray-600">
                                Our website may contain links to third-party websites. We are not responsible for their
                                privacy
                                practices and encourage you to review their policies.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Changes to This Privacy
                                Policy</h2>
                            <p className="text-gray-600">
                                We may update this Privacy Policy periodically. The latest version will be posted on our
                                website
                                with an updated effective date.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Contact Us</h2>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}