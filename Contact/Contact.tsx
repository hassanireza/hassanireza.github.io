import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTurnstile } from "./useTurnstile";
import "./Contact.css";

const FORM_ENDPOINT = "https://formspree.io/f/mvzjdawq";

type FormStatus = { text: string; type: "success" | "error" | "" };

export default function Contact() {
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const { token, reset: resetTurnstile } = useTurnstile(turnstileContainerRef);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ text: "", type: "" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (honeypot.trim() !== "") return;

    if (!token) {
      setStatus({ text: "Please complete the captcha before sending.", type: "error" });
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      setStatus({ text: "Please fill in all fields.", type: "error" });
      return;
    }

    setSubmitting(true);
    setStatus({ text: "Sending...", type: "" });

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
          "cf-turnstile-response": token,
        }),
      });

      if (response.ok) {
        setStatus({ text: "Message sent. I will get back to you soon.", type: "success" });
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        resetTurnstile();
      } else {
        const data = await response.json().catch(() => null);
        const msg =
          data && Array.isArray(data.errors)
            ? data.errors.map((er: { message: string }) => er.message).join(", ")
            : "Something went wrong. Please try again.";
        setStatus({ text: msg, type: "error" });
      }
    } catch {
      setStatus({ text: "Network error. Please try again later.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <header className="page-header">
        <p className="eyebrow">Get In Touch</p>
        <h1>
          <em>Let's talk</em>
        </h1>
        <h2>
          Have a project, a role, or just a question. Send a message and I will get back
          to you.
        </h2>
      </header>

      <div className="content-grid">
        <section className="info-panel">
          <div className="info-block">
            <p className="info-label">Email</p>
            <a href="mailto:reza-h@att.net" className="info-value">
              reza-h@att.net
            </a>
          </div>
          <div className="info-block">
            <p className="info-label">Elsewhere</p>
            <div className="info-links">
              <a href="https://github.com/hassanireza" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <Link to="/portfolio">Portfolio</Link>
              <Link to="/branding">Branding</Link>
            </div>
          </div>
          <div className="info-block">
            <p className="info-label">Response Time</p>
            <p className="info-value-static">Usually within a day or two.</p>
          </div>
        </section>

        <section className="form-panel">
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                autoComplete="off"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <input
              type="text"
              id="company"
              name="company"
              className="hp-field"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            <div className="field captcha-field" ref={turnstileContainerRef} />

            <button type="submit" className="submit-btn" disabled={submitting}>
              <span className="btn-text">Send Message</span>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h10v10h-2V6.414L3.707 13.707 2.293 12.293 9.586 5H3V3z" />
              </svg>
            </button>

            <p className={`form-status${status.type ? ` ${status.type}` : ""}`} role="status" aria-live="polite">
              {status.text}
            </p>
          </form>
        </section>
      </div>

      <footer className="page-footer">
        <Link to="/" className="back-link">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to Home
        </Link>
      </footer>
    </div>
  );
}
