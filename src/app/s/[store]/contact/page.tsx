import { ContactForm } from "@/components/store/contact-form";

export const metadata = { title: "Contact" };

export default function Contact() {
  return (
    <div className="sf-wrap sf-center">
      <div>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div className="sf-eyebrow">Une question ?</div>
          <h1 className="sf-h" style={{ marginTop: 8, fontSize: "clamp(40px, 6vw, 64px)" }}>Contact</h1>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
