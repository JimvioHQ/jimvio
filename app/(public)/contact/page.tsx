import React from "react";
import { Mail, Phone, MapPin, MessageCircle, Send, Globe, Linkedin, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";

export default async function ContactPage() {
  const { contact } = await getResolvedPlatformSettings();
  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-[var(--color-border)] py-20">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 text-center">
          <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
            Support & Inquiry
          </Badge>
          <h1 className="text-5xl md:text-7xl font-[900] text-[var(--color-text-primary)] mb-6 tracking-tighter leading-none">
            Let&apos;s <span className="text-[var(--color-accent)]">Talk Business</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl font-medium max-w-2xl mx-auto">
            Our global support team is available 24/7 to help you with sourcing, logistics, and account inquiries.
          </p>
        </div>
      </section>

      <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
          {/* Contact Info */}
          <div>
            <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-10">Get in Touch</h2>
            <div className="space-y-10">
              <div className="flex items-start gap-6">
                <div className="h-14 w-14 rounded-2xl bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-lg">Email Us</h4>
                  <p className="text-[var(--color-text-secondary)] mb-2 font-medium">For general inquiries and support.</p>
                  <a href={`mailto:${contact.info_email}`} className="text-[var(--color-accent)] font-black text-xl hover:underline">{contact.info_email}</a>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-14 w-14 rounded-2xl bg-ink-dark text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-lg">Live Chat</h4>
                  <p className="text-[var(--color-text-secondary)] mb-2 font-medium">Real-time support via Jimvio Messenger.</p>
                  <Button variant="outline" className="font-black border-2 rounded-xl">Open Chat Now</Button>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-lg">Global HQ</h4>
                  <p className="text-[var(--color-text-secondary)] mb-4 font-medium leading-relaxed">
                    {contact.hq_line1}<br />
                    {contact.hq_line2}
                  </p>
                  <div className="flex gap-4">
                    <a href={contact.social_x} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white border border-[var(--color-border)] rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"><Twitter className="h-5 w-5" /></a>
                    <a href={contact.social_youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white border border-[var(--color-border)] rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"><Youtube className="h-5 w-5" /></a>
                    <a href={contact.social_instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white border border-[var(--color-border)] rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"><Globe className="h-5 w-5" /></a>
                    <a href={contact.social_tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white border border-[var(--color-border)] rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"><Send className="h-5 w-5" /></a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-8">Send a Message</h3>
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black capitalize tracking-widest text-[var(--color-text-muted)]">Full Name</label>
                  <Input placeholder="John Doe" className="h-12 border-2 rounded-xl focus-visible:ring-[var(--color-accent)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black capitalize tracking-widest text-[var(--color-text-muted)]">Email Address</label>
                  <Input placeholder="john@example.com" className="h-12 border-2 rounded-xl focus-visible:ring-[var(--color-accent)]" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black capitalize tracking-widest text-[var(--color-text-muted)]">Subject</label>
                <select className="w-full h-12 border-2 rounded-xl px-4 bg-white font-bold outline-none focus:border-[var(--color-accent)] transition-colors">
                  <option>Sourcing Inquiry</option>
                  <option>Vendor Verification</option>
                  <option>Affiliate Partnership</option>
                  <option>Technical Support</option>
                  <option>Investor Relations</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black capitalize tracking-widest text-[var(--color-text-muted)]">Message</label>
                <Textarea placeholder="How can we help you?" className="min-h-[150px] border-2 rounded-2xl focus-visible:ring-[var(--color-accent)]" />
              </div>
              <Button className="w-full h-14 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-lg rounded-xl shadow-xl shadow-[var(--color-accent)]/20">
                Send Message <Send className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Global Presence Map Placeholder */}
      <section className="py-24 bg-[var(--color-surface-secondary)] border-y border-[var(--color-border)]">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-4">Everywhere You Are</h2>
            <p className="text-[var(--color-text-secondary)] mb-12">With local offices in 6 continents, our expertise is truly global.</p>
            <div className="aspect-[21/9] bg-white border border-[var(--color-border)] rounded-[3rem] shadow-sm flex items-center justify-center">
                <div className="text-center">
                    <Globe className="h-20 w-20 text-[var(--color-accent-light)] mx-auto mb-4" />
                    <p className="text-[var(--color-text-muted)] font-black capitalize tracking-[0.3em]">Interactive Map Incoming</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
}
