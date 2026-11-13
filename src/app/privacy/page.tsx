import { Legal } from "@/components/Legal";

export const metadata = { title: "Privacy · gradients by f13s" };

export default function Page() {
  return (
    <Legal title="Privacy" updated="13 November 2026">
      <p>This page says what gradients by f13s stores about you and why. It describes how the site is built today.</p>
      <h2>What we store</h2>
      <p>When you create an account: your email address, the name you give (optional), and your password in hashed form (scrypt). We never store the password itself.</p>
      <p>When you are signed in: a session record, so the site knows it is you. The cookie holds a random token; we store only a hash of it. Sessions end after 30 days or when you sign out.</p>
      <p>When you buy: the Razorpay order and payment IDs, the amount, the currency and the date, so we can show your purchase and keep your licence active.</p>
      <h2>What we do not store</h2>
      <p>Card, UPI and bank details. Payments are handled by Razorpay; that information goes to them, not to us. Razorpay&apos;s own privacy policy applies to it.</p>
      <p>Gradients you make. A gradient lives in its link; we do not save it to your account.</p>
      <h2>In your browser</h2>
      <p>The session cookie described above, and two local preferences: your saved palettes and your chosen currency. They stay in your browser and are not sent to us.</p>
      <h2>Embedded gradients</h2>
      <p>A page that embeds a gradient loads the gradient script from this site, which is an ordinary web request (like loading an image). After that the gradient runs in the visitor&apos;s browser and sends nothing back.</p>
    </Legal>
  );
}
