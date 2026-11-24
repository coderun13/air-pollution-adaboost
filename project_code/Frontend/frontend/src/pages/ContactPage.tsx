import { useState } from "react";
import { Mail, MapPin, Send, CheckCircle2, MessageSquare } from "lucide-react";

interface ContactFormState {
  name: string;
  email: string;
  organization: string;
  topic: string;
  message: string;
}

const INITIAL_FORM: ContactFormState = {
  name: "",
  email: "",
  organization: "",
  topic: "Data & API Access",
  message: "",
};

export function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-background text-text-primary">
      {/* Header Banner */}
      <section className="border-b border-border bg-[radial-gradient(circle_at_80%_20%,rgba(13,148,136,0.14),transparent_45%),#0B1118]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary-light">
            Contact & Collaboration
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Contact <span className="text-primary">AIRWATCH AI</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Have questions about our All-India dataset, FastAPI endpoints, or AdaBoost AQI
            classification pipeline? Reach out using the form below.
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Info Cards */}
          <div className="space-y-5 lg:col-span-5">
            <div className="surface-card p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-text-primary">
                    Project & Research Inquiries
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    For dataset methodology questions, API integration feedback, or academic
                    collaboration.
                  </p>
                  <p className="mt-2 text-sm font-medium text-primary">
                    support@airwatch-ai.in
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-text-primary">
                    Monitoring Coverage
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    Nationwide Indian CPCB station telemetry covering major urban centers across
                    Delhi NCR, Maharashtra, West Bengal, Karnataka, Tamil Nadu, Telangana, and more.
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-text-primary">
                    Report a Station Anomaly
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    Spotted an unusual sensor spike or missing city reading? Include the station
                    name and timestamp so we can inspect the feed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7">
            <div className="surface-card p-6 sm:p-8">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold text-text-primary">
                    Message Received
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
                    Thank you, <strong className="text-text-primary">{form.name}</strong>. We have
                    logged your inquiry regarding{" "}
                    <strong className="text-text-primary">{form.topic}</strong> and will respond to{" "}
                    <span className="text-primary">{form.email}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(INITIAL_FORM);
                      setSubmitted(false);
                    }}
                    className="btn-secondary mt-6"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="font-display text-xl font-bold text-text-primary">
                      Send Us a Message
                    </h2>
                    <p className="mt-1 text-xs text-text-secondary">
                      Fields marked with * are required.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="field-label">
                        Full Name *
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        placeholder="e.g., Snehal Singh"
                        value={form.name}
                        onChange={handleChange}
                        className="field-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="field-label">
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        className="field-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-org" className="field-label">
                        Organization / Institution
                      </label>
                      <input
                        id="contact-org"
                        name="organization"
                        type="text"
                        placeholder="University, Research Lab, or Company"
                        value={form.organization}
                        onChange={handleChange}
                        className="field-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-topic" className="field-label">
                        Inquiry Topic
                      </label>
                      <select
                        id="contact-topic"
                        name="topic"
                        value={form.topic}
                        onChange={handleChange}
                        className="field-input"
                      >
                        <option value="Data & API Access">Data & API Access</option>
                        <option value="ML Model & Benchmarks">ML Model & Benchmarks</option>
                        <option value="Station Data Feedback">Station Data Feedback</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="field-label">
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      required
                      placeholder="Tell us about your question, city of interest, or feedback..."
                      value={form.message}
                      onChange={handleChange}
                      className="field-input resize-y"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    <Send className="h-4 w-4" />
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}